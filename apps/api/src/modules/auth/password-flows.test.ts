import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
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

describe('password flows', () => {
  let ctx: TestDb;
  let app: express.Express;
  const sendMail = vi.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    ctx = await createTestDb();
    const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });
    const mailer = createMailer({ transport: { sendMail } as any, from: 'Naratala <n@x.co>' });
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
      mailer,
      appUrl: 'https://naratala.local',
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
    sendMail.mockClear();
  });

  async function seed() {
    const h = await hashPassword('correct-horse-12');
    const [row] = await ctx.db
      .insert(users)
      .values({
        email: 'u@naratala.local',
        passwordHash: h,
        role: 'employee',
        status: 'active',
      })
      .$returningId();
    return row!.id;
  }

  it('forgot returns 200 for unknown email with no mail sent', async () => {
    const r = await request(app)
      .post('/api/auth/password/forgot')
      .send({ email: 'unknown@x.co' });
    expect(r.status).toBe(200);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('forgot sends a reset email for known users', async () => {
    await seed();
    const r = await request(app)
      .post('/api/auth/password/forgot')
      .send({ email: 'u@naratala.local' });
    expect(r.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const sent = sendMail.mock.calls[0]![0];
    expect(sent.to).toBe('u@naratala.local');
    expect(sent.html).toMatch(/token=/);
  });

  it('change-password requires current password', async () => {
    await seed();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'u@naratala.local', password: 'correct-horse-12' });
    const token = login.body.accessToken as string;
    const ok = await request(app)
      .post('/api/auth/password/change')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'correct-horse-12', newPassword: 'new-password-42' });
    expect(ok.status).toBe(200);

    const bad = await request(app)
      .post('/api/auth/password/change')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'not-the-right-one', newPassword: 'another-password-99' });
    expect(bad.status).toBe(401);
  });

  it('reset with a good token rotates password', async () => {
    await seed();
    await request(app).post('/api/auth/password/forgot').send({ email: 'u@naratala.local' });
    const link = sendMail.mock.calls[0]![0].html as string;
    const token = /token=([A-Za-z0-9_-]+)/.exec(link)![1]!;
    const r = await request(app)
      .post('/api/auth/password/reset')
      .send({ token, newPassword: 'new-password-42' });
    expect(r.status).toBe(200);

    const again = await request(app)
      .post('/api/auth/password/reset')
      .send({ token, newPassword: 'another-99999999' });
    expect(again.status).toBe(410);
  });
});
