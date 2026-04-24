import type { Response } from 'express';
import { AuthError } from '../../shared/errors/index.js';
import type { UserRepo, UserRow } from './userRepo.js';
import type { LoginAttemptRepo } from './loginAttemptRepo.js';
import type { JwtService } from './jwt.js';
import type { RefreshTokenService } from './refreshTokenService.js';
import {
  DUMMY_BCRYPT_HASH,
  verifyPassword,
  hashPassword,
  assertPasswordStrong,
  checkPwned,
} from './password.js';
import { newOpaqueToken, sha256Hex } from './opaqueToken.js';
import type { PasswordResetRepo } from './passwordResetRepo.js';
import type { Mailer } from '../../shared/mail/mailer.js';
import { passwordResetEmail } from '../../shared/mail/templates.js';

interface Deps {
  users: UserRepo;
  loginAttempts: LoginAttemptRepo;
  jwt: JwtService;
  refresh: RefreshTokenService;
  refreshTtlMs: number;
  passwordResets: PasswordResetRepo;
  mailer: Mailer;
  appUrl: string;
  hibp?: (prefix: string) => Promise<string>;
}

const LOCK_THRESHOLD = 10;
const LOCK_WINDOW_MS = 15 * 60_000;

export type LoginResult =
  | { kind: 'mfa'; mfaToken: string }
  | {
      kind: 'tokens';
      accessToken: string;
      refreshToken: string;
      refreshExpiresAt: Date;
      user: UserRow;
    };

export interface IssuedTokens {
  kind: 'tokens';
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: UserRow;
}

export interface AuthService {
  login: (input: {
    email: string;
    password: string;
    ip: string;
    userAgent?: string;
  }) => Promise<LoginResult>;
  issueFreshTokens: (user: UserRow, ip: string, userAgent?: string) => Promise<IssuedTokens>;
  verifyMfa: (input: {
    mfaToken: string;
    code: string;
    ip: string;
    userAgent?: string;
  }) => Promise<IssuedTokens>;
  refreshSession: (input: {
    rawToken: string;
    ip: string;
    userAgent?: string;
  }) => Promise<{
    accessToken: string;
    refreshToken: string;
    refreshExpiresAt: Date;
    user: UserRow;
  }>;
  logout: (input: { rawToken?: string | undefined }) => Promise<void>;
  getMe: (userId: number) => Promise<UserRow>;
  changePassword: (userId: number, current: string, next: string) => Promise<void>;
  requestForgot: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

export function createAuthService(deps: Deps): AuthService {
  async function login(input: {
    email: string;
    password: string;
    ip: string;
    userAgent?: string;
  }): Promise<LoginResult> {
    const email = input.email.toLowerCase();
    const recent = await deps.loginAttempts.failedSince(
      email,
      new Date(Date.now() - LOCK_WINDOW_MS),
    );
    if (recent >= LOCK_THRESHOLD) {
      await deps.loginAttempts.record(email, input.ip, false);
      throw new AuthError('INVALID_CREDENTIALS', 'invalid credentials');
    }

    const user = await deps.users.findByEmail(email);
    const hash = user?.passwordHash ?? DUMMY_BCRYPT_HASH;
    const ok = await verifyPassword(input.password, hash);

    if (!user || !ok || user.status === 'disabled' || user.deletedAt) {
      await deps.loginAttempts.record(email, input.ip, false);
      throw new AuthError('INVALID_CREDENTIALS', 'invalid credentials');
    }

    await deps.loginAttempts.record(email, input.ip, true);

    if (user.mfaEnabled) {
      const mfaToken = deps.jwt.signMfaToken({ sub: user.id });
      return { kind: 'mfa', mfaToken };
    }

    return issueFreshTokens(user, input.ip, input.userAgent);
  }

  async function issueFreshTokens(
    user: UserRow,
    ip: string,
    userAgent?: string,
  ): Promise<IssuedTokens> {
    const accessToken = deps.jwt.signAccess({ sub: user.id, role: user.role });
    const r = await deps.refresh.issueNew({
      userId: user.id,
      ip,
      userAgent: userAgent ?? null,
    });
    await deps.users.setLastLogin(user.id, new Date());
    return {
      kind: 'tokens',
      accessToken,
      refreshToken: r.rawToken,
      refreshExpiresAt: r.expiresAt,
      user,
    };
  }

  async function verifyMfa(input: {
    mfaToken: string;
    code: string;
    ip: string;
    userAgent?: string;
  }): Promise<IssuedTokens> {
    const payload = deps.jwt.verifyMfaToken(input.mfaToken);
    const user = await deps.users.findById(payload.sub);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new AuthError('MFA_INVALID', 'mfa not enabled');
    }
    const { decryptGcm } = await import('./crypto.js');
    const { verifyTotp } = await import('./mfa.js');
    const { loadEnv } = await import('../../shared/config/env.js');
    const key = loadEnv().MFA_ENCRYPTION_KEY;
    const secret = decryptGcm(key, user.mfaSecret);
    if (!verifyTotp(secret, input.code)) throw new AuthError('MFA_INVALID', 'invalid code');
    return issueFreshTokens(user, input.ip, input.userAgent);
  }

  async function refreshSession(input: {
    rawToken: string;
    ip: string;
    userAgent?: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    refreshExpiresAt: Date;
    user: UserRow;
  }> {
    const rotated = await deps.refresh.rotate({
      rawToken: input.rawToken,
      ip: input.ip,
      userAgent: input.userAgent ?? null,
    });
    const user = await deps.users.findById(rotated.userId);
    if (!user || user.status === 'disabled' || user.deletedAt) {
      await deps.refresh.revokeAllForUser(rotated.userId);
      throw new AuthError('TOKEN_EXPIRED', 'account not eligible');
    }
    const accessToken = deps.jwt.signAccess({ sub: user.id, role: user.role });
    return {
      accessToken,
      refreshToken: rotated.rawToken,
      refreshExpiresAt: rotated.expiresAt,
      user,
    };
  }

  async function logout(input: { rawToken?: string | undefined }): Promise<void> {
    if (input.rawToken) await deps.refresh.revokeByToken(input.rawToken);
  }

  async function getMe(userId: number): Promise<UserRow> {
    const user = await deps.users.findById(userId);
    if (!user) throw new AuthError('TOKEN_EXPIRED', 'user not found');
    return user;
  }

  async function changePassword(userId: number, current: string, next: string): Promise<void> {
    const user = await deps.users.findById(userId);
    if (!user) throw new AuthError('INVALID_CREDENTIALS', 'user not found');
    if (!(await verifyPassword(current, user.passwordHash))) {
      throw new AuthError('INVALID_CREDENTIALS', 'current password invalid');
    }
    assertPasswordStrong(next);
    if (await checkPwned(next, deps.hibp))
      throw new AuthError('PASSWORD_PWNED', 'password compromised');
    const hash = await hashPassword(next);
    await deps.users.updatePasswordHash(user.id, hash, false);
    await deps.refresh.revokeAllForUser(user.id);
  }

  async function requestForgot(email: string): Promise<void> {
    const start = Date.now();
    const user = await deps.users.findByEmail(email);
    if (user && user.status !== 'disabled') {
      const raw = newOpaqueToken();
      const expiresAt = new Date(Date.now() + 60 * 60_000);
      await deps.passwordResets.insert(user.id, sha256Hex(raw), expiresAt);
      const tmpl = passwordResetEmail({
        url: `${deps.appUrl}/password/reset?token=${raw}`,
        expiresAt,
      });
      await deps.mailer.send({ to: user.email, subject: tmpl.subject, html: tmpl.html });
    }
    const elapsed = Date.now() - start;
    if (elapsed < 200) await new Promise((r) => setTimeout(r, 200 - elapsed));
  }

  async function resetPassword(token: string, newPassword: string): Promise<void> {
    const found = await deps.passwordResets.findUsableByHash(sha256Hex(token), new Date());
    if (!found) throw new AuthError('INVITE_EXPIRED', 'reset token invalid or expired');
    assertPasswordStrong(newPassword);
    if (await checkPwned(newPassword, deps.hibp))
      throw new AuthError('PASSWORD_PWNED', 'password compromised');
    const hash = await hashPassword(newPassword);
    await deps.users.updatePasswordHash(found.userId, hash, false);
    await deps.passwordResets.consume(found.id);
    await deps.refresh.revokeAllForUser(found.userId);
  }

  return {
    login,
    issueFreshTokens,
    verifyMfa,
    refreshSession,
    logout,
    getMe,
    changePassword,
    requestForgot,
    resetPassword,
  };
}

export function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie('rt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    path: '/api/auth',
    expires: expiresAt,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie('rt', { path: '/api/auth' });
}
