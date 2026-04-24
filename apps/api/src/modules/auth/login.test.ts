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

describe('POST /api/auth/login (no MFA)', () => {
  let ctx: TestDb;
  let app: express.Express;

  beforeAll(async () => {
    ctx = await createTestDb();
    const userRepo = createUserRepo(ctx.db);
    const attemptsRepo = createLoginAttemptRepo(ctx.db);
    const refreshRepo = createRefreshTokenRepo(ctx.db);
    const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });
    const refresh = createRefreshTokenService({
      repo: refreshRepo,
      ttlMs: 30 * 24 * 60 * 60 * 1000,
    });
    const service = createAuthService({
      users: userRepo,
      loginAttempts: attemptsRepo,
      jwt,
      refresh,
      refreshTtlMs: 30 * 24 * 60 * 60 * 1000,
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

  async function seedUser(email = 'u@naratala.local', pw = 'correct-horse-12') {
    const h = await hashPassword(pw);
    await ctx.db
      .insert(users)
      .values({ email, passwordHash: h, role: 'employee', status: 'active' });
  }

  it('200 + accessToken + rt cookie on valid credentials', async () => {
    await seedUser();
    const r = await request(app)
      .post('/api/auth/login')
      .send({ email: 'U@naratala.local', password: 'correct-horse-12' });
    expect(r.status).toBe(200);
    expect(r.body.accessToken).toBeDefined();
    expect(r.body.user.email).toBe('u@naratala.local');
    expect(r.headers['set-cookie']?.[0]).toMatch(/^rt=/);
    expect(r.headers['set-cookie']?.[0]).toMatch(/HttpOnly/);
    expect(r.headers['set-cookie']?.[0]).toMatch(/Path=\/api\/auth/);
  });

  it('401 INVALID_CREDENTIALS on wrong password', async () => {
    await seedUser();
    const r = await request(app)
      .post('/api/auth/login')
      .send({ email: 'u@naratala.local', password: 'wrong-password' });
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('401 INVALID_CREDENTIALS on unknown email (no enumeration)', async () => {
    const r = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nope@x.co', password: 'whatever1234' });
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('401 on disabled account', async () => {
    const h = await hashPassword('correct-horse-12');
    await ctx.db
      .insert(users)
      .values({ email: 'd@naratala.local', passwordHash: h, role: 'employee', status: 'disabled' });
    const r = await request(app)
      .post('/api/auth/login')
      .send({ email: 'd@naratala.local', password: 'correct-horse-12' });
    expect(r.status).toBe(401);
  });
});
