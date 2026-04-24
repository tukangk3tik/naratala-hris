import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
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

describe('refresh + logout + me', () => {
  let ctx: TestDb;
  let app: express.Express;

  beforeAll(async () => {
    ctx = await createTestDb();
    const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });
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
    await ctx.db.insert(users).values({
      email: 'u@naratala.local',
      passwordHash: h,
      role: 'employee',
      status: 'active',
    });
    const r = await request(app)
      .post('/api/auth/login')
      .send({ email: 'u@naratala.local', password: 'correct-horse-12' });
    return { accessToken: r.body.accessToken as string, cookie: r.headers['set-cookie']![0]! };
  }

  it('/refresh rotates and issues a new access token', async () => {
    const { cookie } = await loginFresh();
    const r1 = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(r1.status).toBe(200);
    expect(r1.body.accessToken).toBeDefined();
    expect(r1.headers['set-cookie']?.[0]).toMatch(/^rt=/);

    const r2 = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(r2.status).toBe(401);
    expect(r2.body.code).toBe('TOKEN_REUSED');
  });

  it('/logout clears the cookie and revokes', async () => {
    const { cookie } = await loginFresh();
    const lo = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(lo.status).toBe(204);

    const r = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(r.status).toBe(401);
  });

  it('/me returns the current user', async () => {
    const { accessToken } = await loginFresh();
    const r = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(r.status).toBe(200);
    expect(r.body.user.email).toBe('u@naratala.local');
  });
});
