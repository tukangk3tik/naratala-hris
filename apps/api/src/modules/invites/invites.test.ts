import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createTestDb, type TestDb } from '../../test/db.js';
import { departments, employees, users } from '../../shared/db/schema.js';
import { hashPassword } from '../auth/password.js';
import { createUserRepo } from '../auth/userRepo.js';
import { createLoginAttemptRepo } from '../auth/loginAttemptRepo.js';
import { createRefreshTokenRepo } from '../auth/refreshTokenRepo.js';
import { createRefreshTokenService } from '../auth/refreshTokenService.js';
import { createJwtService } from '../auth/jwt.js';
import { createAuthService } from '../auth/authService.js';
import { createAuthRouter } from '../auth/authRoutes.js';
import { createPasswordResetRepo } from '../auth/passwordResetRepo.js';
import { createInviteRepo } from './inviteRepo.js';
import { createInviteService } from './inviteService.js';
import { createInviteRouter } from './inviteRoutes.js';
import { createMailer } from '../../shared/mail/mailer.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';

describe('invites', () => {
  let ctx: TestDb;
  let app: express.Express;
  const sendMail = vi.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    ctx = await createTestDb();
    const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });
    const mailer = createMailer({ transport: { sendMail } as any, from: 'Naratala <n@x.co>' });
    const userRepo = createUserRepo(ctx.db);
    const authSvc = createAuthService({
      users: userRepo,
      loginAttempts: createLoginAttemptRepo(ctx.db),
      jwt,
      refresh: createRefreshTokenService({
        repo: createRefreshTokenRepo(ctx.db),
        ttlMs: 30 * 86400000,
      }),
      refreshTtlMs: 30 * 86400000,
      passwordResets: createPasswordResetRepo(ctx.db),
      mailer,
      appUrl: 'http://localhost:5173',
      hibp: async () => '',
    });
    const inviteSvc = createInviteService({
      db: ctx.db,
      invites: createInviteRepo(ctx.db),
      users: userRepo,
      mailer,
      auth: authSvc,
      appUrl: 'http://localhost:5173',
      ttlMs: 48 * 3600 * 1000,
      hibp: async () => '',
    });

    app = express();
    app.set('trust proxy', 1);
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/auth', createAuthRouter({ service: authSvc, jwt }));
    app.use('/api/invites', createInviteRouter({ service: inviteSvc, jwt }));
    app.use(errorHandler());
  });
  afterAll(async () => {
    await ctx.drop();
  });
  beforeEach(async () => {
    await ctx.truncateAll();
    sendMail.mockClear();
  });

  async function seedAdminAndEmployee() {
    const pw = await hashPassword('correct-horse-12');
    await ctx.db
      .insert(users)
      .values({
        email: 'admin@naratala.local',
        passwordHash: pw,
        role: 'admin',
        status: 'active',
      })
      .$returningId();
    const [dep] = await ctx.db.insert(departments).values({ name: 'Eng' }).$returningId();
    const [emp] = await ctx.db
      .insert(employees)
      .values({
        fullName: 'Ayu Wulan',
        email: 'ayu@naratala.local',
        departmentId: dep!.id,
        position: 'Engineer',
        employmentType: 'full_time',
        hireDate: '2025-01-15',
        avatarColorHue: 120,
      })
      .$returningId();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@naratala.local', password: 'correct-horse-12' });
    return { accessToken: login.body.accessToken as string, employeeId: emp!.id };
  }

  it('admin issues → employee views → employee accepts and is logged in', async () => {
    const { accessToken, employeeId } = await seedAdminAndEmployee();

    const issue = await request(app)
      .post('/api/invites')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ employeeId, role: 'manager' });
    expect(issue.status).toBe(201);
    expect(sendMail).toHaveBeenCalledTimes(1);

    const html = sendMail.mock.calls[0]![0].html as string;
    const token = /token=([A-Za-z0-9_-]+)/.exec(html)![1]!;

    const view = await request(app).get(`/api/invites/${token}`);
    expect(view.status).toBe(200);
    expect(view.body.email).toBe('ayu@naratala.local');

    const accept = await request(app)
      .post(`/api/invites/${token}/accept`)
      .send({ password: 'ayu-password-12' });
    expect(accept.status).toBe(200);
    expect(accept.body.user.role).toBe('manager');
    expect(accept.body.user.email).toBe('ayu@naratala.local');

    const again = await request(app)
      .post(`/api/invites/${token}/accept`)
      .send({ password: 'ayu-password-12' });
    expect(again.status).toBe(410);
  });

  it('resend rotates token; old token stops working', async () => {
    const { accessToken, employeeId } = await seedAdminAndEmployee();
    const issue = await request(app)
      .post('/api/invites')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ employeeId, role: 'employee' });
    const id = issue.body.id as number;
    const oldHtml = sendMail.mock.calls[0]![0].html as string;
    const oldToken = /token=([A-Za-z0-9_-]+)/.exec(oldHtml)![1]!;

    const resend = await request(app)
      .post(`/api/invites/${id}/resend`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(resend.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(2);

    const view = await request(app).get(`/api/invites/${oldToken}`);
    expect(view.status).toBe(410);
  });

  it('non-admin cannot issue', async () => {
    const pw = await hashPassword('correct-horse-12');
    await ctx.db
      .insert(users)
      .values({
        email: 'm@naratala.local',
        passwordHash: pw,
        role: 'manager',
        status: 'active',
      });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'm@naratala.local', password: 'correct-horse-12' });
    const r = await request(app)
      .post('/api/invites')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ employeeId: 1, role: 'manager' });
    expect(r.status).toBe(403);
  });
});
