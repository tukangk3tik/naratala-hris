import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import type { Role } from '@naratala/shared';
import { AuthError } from '../../shared/errors/index.js';

export interface AccessPayload {
  sub: number;
  role: Role;
  iat: number;
  exp: number;
  jti: string;
  scope: 'access';
}

export interface MfaPayload {
  sub: number;
  iat: number;
  exp: number;
  jti: string;
  scope: 'mfa';
}

interface Config {
  secret: string;
  accessTtl: string;
  issuer?: string;
}

export interface JwtService {
  signAccess: (input: { sub: number; role: Role }) => string;
  signMfaToken: (input: { sub: number }) => string;
  verifyAccess: (token: string) => AccessPayload;
  verifyMfaToken: (token: string) => MfaPayload;
}

export function createJwtService(cfg: Config): JwtService {
  const base = { algorithm: 'HS256' as const, issuer: cfg.issuer ?? 'naratala' };

  function signAccess(input: { sub: number; role: Role }): string {
    return jwt.sign({ role: input.role, scope: 'access' }, cfg.secret, {
      ...base,
      subject: String(input.sub),
      expiresIn: cfg.accessTtl as jwt.SignOptions['expiresIn'],
      jwtid: randomUUID(),
    });
  }

  function signMfaToken(input: { sub: number }): string {
    return jwt.sign({ scope: 'mfa' }, cfg.secret, {
      ...base,
      subject: String(input.sub),
      expiresIn: '5m',
      jwtid: randomUUID(),
    });
  }

  function verifyAccess(token: string): AccessPayload {
    try {
      const decoded = jwt.verify(token, cfg.secret, { ...base, clockTolerance: 30 }) as Record<
        string,
        unknown
      >;
      if (decoded.scope !== 'access') throw new AuthError('TOKEN_EXPIRED', 'invalid token scope');
      return { ...decoded, sub: Number(decoded.sub) } as unknown as AccessPayload;
    } catch (e) {
      if (e instanceof AuthError) throw e;
      throw new AuthError('TOKEN_EXPIRED', 'invalid or expired token');
    }
  }

  function verifyMfaToken(token: string): MfaPayload {
    try {
      const decoded = jwt.verify(token, cfg.secret, { ...base, clockTolerance: 30 }) as Record<
        string,
        unknown
      >;
      if (decoded.scope !== 'mfa') throw new AuthError('MFA_INVALID', 'invalid mfa scope');
      return { ...decoded, sub: Number(decoded.sub) } as unknown as MfaPayload;
    } catch (e) {
      if (e instanceof AuthError) throw e;
      throw new AuthError('MFA_INVALID', 'invalid or expired mfa token');
    }
  }

  return { signAccess, signMfaToken, verifyAccess, verifyMfaToken };
}
