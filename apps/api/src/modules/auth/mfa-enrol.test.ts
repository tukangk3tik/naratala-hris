import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { authenticator } from 'otplib';
import { createTestDb, type TestDb } from '../../test/db.js';
import { hashPassword } from './password.js';
import { createUserRepo } from './userRepo.js';
import { createLoginAttemptRepo } from './loginAttemptRepo.js';
import { createRefreshTokenRepo } from './refreshTokenRepo.js';
import { createRefreshTokenService } from './refreshTokenService.js';
import { createJwtService } from './jwt.js';
import { createAuthService } from './authService.js';
import { createAuthRouter } from './authRoutes.js';
import { createPasswordResetRepo } from './passwordResetRepo.js';
import { createMailer } from '../../shared/mail/mailer.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';
import { users } from '../../shared/db/schema.js';

describe('mfa enrol + disable', () => {
  let ctx: TestDb;
  let app: express.Express;

  beforeAll(async () => {
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('base64');
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(86);
    process.env.WEB_ORIGIN = 'http://localhost:5173';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'mysql://naratala:dev@127.0.0.1:3306/naratala';
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = '1025';
    process.env.MAIL_FROM = 'x@y.co';
    process.env.INITIAL_ADMIN_EMAIL = 'a@b.co';
    process.env.INITIAL_ADMIN_PASSWORD = 'dev-password-12';

    ctx = await createTestDb();
    const jwt = createJwtService({ secret: process.env.JWT_ACCESS_SECRET!, accessTtl: '15m' });
    const service = createAuthService({
      users: createUserRepo(ctx.db),
      loginAttempts: createLoginAttemptRepo(ctx.db),
      jwt,
      refresh: createRefreshTokenService({
        repo: createRefreshTokenRepo(ctx.db),
        ttlMs: 30 * 86400000,
      }),
      refreshTtlMs: 30 * 86400000,
      passwordResets: createPasswordResetRepo(ctx.db),
      mailer: createMailer({
        transport: { sendMail: async () => undefined } as any,
        from: 'x@y.co',
      }),
      appUrl: 'http://localhost:5173',
      hibp: async () => '',
    });
    app = express();
    app.set('trust proxy', 1);
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/auth', createAuthRouter({ service, jwt }));
    app.use(errorHandler());
  });
  afterAll(async () => {
    await ctx.drop();
  });
  beforeEach(async () => {
    await ctx.truncateAll();
  });

  async function loginFresh() {
    const h = await hashPassword('correct-horse-12');
    await ctx.db
      .insert(users)
      .values({ email: 'u@naratala.local', passwordHash: h, role: 'hr', status: 'active' });
    const r = await request(app)
      .post('/api/auth/login')
      .send({ email: 'u@naratala.local', password: 'correct-horse-12' });
    return r.body.accessToken as string;
  }

  it('start + confirm + subsequent login returns mfaRequired', async () => {
    const token = await loginFresh();
    const start = await request(app)
      .post('/api/auth/mfa/setup/start')
      .set('Authorization', `Bearer ${token}`);
    expect(start.status).toBe(200);
    const secret = start.body.secret as string;
    const code = authenticator.generate(secret);
    const conf = await request(app)
      .post('/api/auth/mfa/setup/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ secret, code });
    expect(conf.status).toBe(200);
    expect(conf.body.recoveryCodes).toHaveLength(10);

    const next = await request(app)
      .post('/api/auth/login')
      .send({ email: 'u@naratala.local', password: 'correct-horse-12' });
    expect(next.status).toBe(200);
    expect(next.body.mfaRequired).toBe(true);
    expect(next.body.mfaToken).toBeDefined();
  });

  it('/mfa/verify trades mfaToken for full tokens', async () => {
    const token = await loginFresh();
    const start = await request(app)
      .post('/api/auth/mfa/setup/start')
      .set('Authorization', `Bearer ${token}`);
    const secret = start.body.secret as string;
    await request(app)
      .post('/api/auth/mfa/setup/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ secret, code: authenticator.generate(secret) });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'u@naratala.local', password: 'correct-horse-12' });
    const verify = await request(app)
      .post('/api/auth/mfa/verify')
      .set('Authorization', `Bearer ${login.body.mfaToken}`)
      .send({ code: authenticator.generate(secret) });
    expect(verify.status).toBe(200);
    expect(verify.body.accessToken).toBeDefined();
  });
});
