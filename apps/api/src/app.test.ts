import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { buildApp } from './app.js';
import { createTestDb, type TestDb } from './test/db.js';
import { loadEnv } from './shared/config/env.js';

describe('app wiring', () => {
  let ctx: TestDb;
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    ctx = await createTestDb();
    process.env.WEB_ORIGIN = 'http://localhost:5173';
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(86);
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = '1025';
    process.env.MAIL_FROM = 'Naratala <n@x.co>';
    process.env.INITIAL_ADMIN_EMAIL = 'a@b.co';
    process.env.INITIAL_ADMIN_PASSWORD = 'dev-password-12';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'mysql://naratala:dev@127.0.0.1:3306/naratala';
    const env = loadEnv();
    app = buildApp({ env, db: ctx.db });
  });
  afterAll(async () => {
    await ctx.drop();
  });

  it('GET /api/health → 200 { ok, db }', async () => {
    const r = await request(app).get('/api/health');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, db: true });
  });

  it('sets security headers', async () => {
    const r = await request(app).get('/api/health');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-frame-options']).toBeDefined();
  });

  it('unknown route → 404 NOT_FOUND', async () => {
    const r = await request(app).get('/api/nope');
    expect(r.status).toBe(404);
    expect(r.body.code).toBe('NOT_FOUND');
  });
});
