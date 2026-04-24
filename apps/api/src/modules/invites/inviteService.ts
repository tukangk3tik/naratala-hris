import { and, eq, isNull } from 'drizzle-orm';
import type { Role } from '@naratala/shared';
import { AuthError, NotFoundError, ValidationError } from '../../shared/errors/index.js';
import { newOpaqueToken, sha256Hex } from '../auth/opaqueToken.js';
import { assertPasswordStrong, checkPwned, hashPassword } from '../auth/password.js';
import type { InviteRepo } from './inviteRepo.js';
import type { UserRepo } from '../auth/userRepo.js';
import type { DB } from '../../shared/db/client.js';
import { employees, users } from '../../shared/db/schema.js';
import type { Mailer } from '../../shared/mail/mailer.js';
import { inviteEmail } from '../../shared/mail/templates.js';
import type { AuthService, IssuedTokens } from '../auth/authService.js';

interface Deps {
  db: DB;
  invites: InviteRepo;
  users: UserRepo;
  mailer: Mailer;
  auth: AuthService;
  appUrl: string;
  ttlMs: number;
  hibp?: (prefix: string) => Promise<string>;
}

export interface InviteService {
  issue: (
    actorId: number,
    employeeId: number,
    role: Role,
  ) => Promise<{ id: number; expiresAt: Date }>;
  view: (rawToken: string) => Promise<{ email: string; fullName: string; expiresAt: string }>;
  accept: (
    rawToken: string,
    password: string,
    ip: string,
    userAgent?: string,
  ) => Promise<IssuedTokens>;
  resend: (id: number) => Promise<{ id: number; expiresAt: Date }>;
  remove: (id: number) => Promise<void>;
}

export function createInviteService(deps: Deps): InviteService {
  async function sendInvite(name: string, email: string, rawToken: string, expiresAt: Date) {
    const url = `${deps.appUrl}/invite/accept?token=${rawToken}`;
    const tmpl = inviteEmail({ recipientName: name, url, expiresAt });
    await deps.mailer.send({ to: email, subject: tmpl.subject, html: tmpl.html });
  }

  async function issue(actorId: number, employeeId: number, role: Role) {
    const [emp] = await deps.db
      .select()
      .from(employees)
      .where(and(eq(employees.id, employeeId), isNull(employees.deletedAt)))
      .limit(1);
    if (!emp) throw new NotFoundError('employee not found');
    const raw = newOpaqueToken();
    const expiresAt = new Date(Date.now() + deps.ttlMs);
    const id = await deps.invites.create({
      employeeId,
      email: emp.email,
      roleToAssign: role,
      tokenHash: sha256Hex(raw),
      expiresAt,
      createdBy: actorId,
    });
    await sendInvite(emp.fullName, emp.email, raw, expiresAt);
    return { id, expiresAt };
  }

  async function view(rawToken: string) {
    const row = await deps.invites.findUsableByHash(sha256Hex(rawToken), new Date());
    if (!row) throw new AuthError('INVITE_EXPIRED', 'invite invalid or expired');
    return {
      email: row.email,
      fullName: row.employeeFullName,
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  async function accept(
    rawToken: string,
    password: string,
    ip: string,
    userAgent?: string,
  ): Promise<IssuedTokens> {
    const row = await deps.invites.findUsableByHash(sha256Hex(rawToken), new Date());
    if (!row) throw new AuthError('INVITE_EXPIRED', 'invite invalid or expired');
    assertPasswordStrong(password);
    if (await checkPwned(password, deps.hibp))
      throw new AuthError('PASSWORD_PWNED', 'password compromised');
    const pwHash = await hashPassword(password);

    const existing = await deps.users.findByEmail(row.email);
    let userId: number;
    if (existing) {
      if (existing.status !== 'pending')
        throw new AuthError('EMAIL_TAKEN', 'user already active');
      await deps.users.updatePasswordHash(existing.id, pwHash, false);
      await deps.users.patch(existing.id, { status: 'active', role: row.roleToAssign });
      userId = existing.id;
    } else {
      const [inserted] = await deps.db
        .insert(users)
        .values({
          email: row.email,
          passwordHash: pwHash,
          role: row.roleToAssign,
          status: 'active',
        })
        .$returningId();
      userId = inserted!.id;
    }
    await deps.db.update(employees).set({ userId }).where(eq(employees.id, row.employeeId));
    await deps.invites.markAccepted(row.id);

    const user = await deps.users.findById(userId);
    if (!user) throw new ValidationError('invite accept failed');
    return deps.auth.issueFreshTokens(user, ip, userAgent);
  }

  async function resend(id: number) {
    const row = await deps.invites.findById(id);
    if (!row) throw new NotFoundError('invite not found');
    if (row.acceptedAt) throw new AuthError('INVITE_ALREADY_ACCEPTED', 'already accepted');
    const [emp] = await deps.db
      .select()
      .from(employees)
      .where(eq(employees.id, row.employeeId))
      .limit(1);
    if (!emp) throw new NotFoundError('employee missing');
    const raw = newOpaqueToken();
    const expiresAt = new Date(Date.now() + deps.ttlMs);
    await deps.invites.rotate(id, sha256Hex(raw), expiresAt);
    await sendInvite(emp.fullName, emp.email, raw, expiresAt);
    return { id, expiresAt };
  }

  async function remove(id: number) {
    const row = await deps.invites.findById(id);
    if (!row) throw new NotFoundError('invite not found');
    if (row.acceptedAt) throw new AuthError('INVITE_ALREADY_ACCEPTED', 'already accepted');
    await deps.invites.deleteById(id);
  }

  return { issue, view, accept, resend, remove };
}
