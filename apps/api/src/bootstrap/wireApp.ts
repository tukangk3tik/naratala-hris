import type { Express } from 'express';
import type { Env } from '../shared/config/env.js';
import type { DB } from '../shared/db/client.js';

import { createJwtService } from '../modules/auth/jwt.js';
import { createUserRepo } from '../modules/auth/userRepo.js';
import { createLoginAttemptRepo } from '../modules/auth/loginAttemptRepo.js';
import { createRefreshTokenRepo } from '../modules/auth/refreshTokenRepo.js';
import { createRefreshTokenService } from '../modules/auth/refreshTokenService.js';
import { createPasswordResetRepo } from '../modules/auth/passwordResetRepo.js';
import { createAuthService } from '../modules/auth/authService.js';
import { createAuthRouter } from '../modules/auth/authRoutes.js';
import { createMailer, createSmtpTransport } from '../shared/mail/mailer.js';
import { createInviteRepo } from '../modules/invites/inviteRepo.js';
import { createInviteService } from '../modules/invites/inviteService.js';
import { createInviteRouter } from '../modules/invites/inviteRoutes.js';
import { createDepartmentRepo } from '../modules/departments/departmentRepo.js';
import { createDepartmentService } from '../modules/departments/departmentService.js';
import { createDepartmentRouter } from '../modules/departments/departmentRoutes.js';
import { createUserService } from '../modules/users/userService.js';
import { createUserRouter } from '../modules/users/userRoutes.js';
import { createEmployeeRepo } from '../modules/employees/employeeRepo.js';
import { createEmployeeService } from '../modules/employees/employeeService.js';
import { createEmployeeRouter } from '../modules/employees/employeeRoutes.js';
import { createAuditRepo } from '../modules/audit/auditRepo.js';
import { createAuditService } from '../modules/audit/auditService.js';
import { createAuditRouter } from '../modules/audit/auditRoutes.js';

function ttlToMs(value: string): number {
  const m = /^(\d+)([smhd])$/.exec(value);
  if (!m) throw new Error(`bad ttl: ${value}`);
  const n = Number(m[1]);
  const unit = m[2] as 's' | 'm' | 'h' | 'd';
  return n * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
}

export function wireRoutes(app: Express, deps: { db: DB; env: Env }): void {
  const { db, env } = deps;
  const jwt = createJwtService({
    secret: env.JWT_ACCESS_SECRET,
    accessTtl: env.ACCESS_TOKEN_TTL,
  });
  const refreshTtlMs = ttlToMs(env.REFRESH_TOKEN_TTL);

  const userRepo = createUserRepo(db);
  const refresh = createRefreshTokenService({
    repo: createRefreshTokenRepo(db),
    ttlMs: refreshTtlMs,
  });
  const mailer = createMailer({
    transport: createSmtpTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      ...(env.SMTP_USER ? { user: env.SMTP_USER } : {}),
      ...(env.SMTP_PASS ? { pass: env.SMTP_PASS } : {}),
    }),
    from: env.MAIL_FROM,
  });
  const authSvc = createAuthService({
    users: userRepo,
    loginAttempts: createLoginAttemptRepo(db),
    jwt,
    refresh,
    refreshTtlMs,
    passwordResets: createPasswordResetRepo(db),
    mailer,
    appUrl: env.WEB_ORIGIN,
  });
  const inviteSvc = createInviteService({
    db,
    invites: createInviteRepo(db),
    users: userRepo,
    mailer,
    auth: authSvc,
    appUrl: env.WEB_ORIGIN,
    ttlMs: 48 * 3_600_000,
  });
  const deptSvc = createDepartmentService(createDepartmentRepo(db));
  const userSvc = createUserService({ users: userRepo, refresh });
  const auditRepo = createAuditRepo(db);
  const auditSvc = createAuditService(auditRepo);
  const empSvc = createEmployeeService({
    employees: createEmployeeRepo(db),
    users: userRepo,
    audit: auditRepo,
    refresh,
  });

  app.use('/api/auth', createAuthRouter({ service: authSvc, jwt }));
  app.use('/api/invites', createInviteRouter({ service: inviteSvc, jwt }));
  app.use('/api/departments', createDepartmentRouter({ service: deptSvc, jwt }));
  app.use('/api/users', createUserRouter({ service: userSvc, jwt }));
  app.use('/api/employees', createEmployeeRouter({ service: empSvc, jwt }));
  app.use('/api/audit', createAuditRouter({ service: auditSvc, jwt }));
}
