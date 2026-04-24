import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createJwtService } from '../auth/jwt.js';
import { createUserRepo } from '../auth/userRepo.js';
import { createRefreshTokenRepo } from '../auth/refreshTokenRepo.js';
import { createRefreshTokenService } from '../auth/refreshTokenService.js';
import { createUserService } from './userService.js';
import { createUserRouter } from './userRoutes.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';
import { hashPassword } from '../auth/password.js';
import { users } from '../../shared/db/schema.js';

describe('users module', () => {
  let ctx: TestDb;
  let app: express.Express;
  const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });

  beforeAll(async () => {
    ctx = await createTestDb();
    const repo = createUserRepo(ctx.db);
    const refresh = createRefreshTokenService({
      repo: createRefreshTokenRepo(ctx.db),
      ttlMs: 30 * 86400000,
    });
    const svc = createUserService({ users: repo, refresh });
    app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/users', createUserRouter({ service: svc, jwt }));
    app.use(errorHandler());
  });
  afterAll(async () => {
    await ctx.drop();
  });
  beforeEach(async () => {
    await ctx.truncateAll();
  });

  async function seedAdmin() {
    const pw = await hashPassword('correct-horse-12');
    const [row] = await ctx.db
      .insert(users)
      .values({
        email: 'admin@naratala.local',
        passwordHash: pw,
        role: 'admin',
        status: 'active',
      })
      .$returningId();
    return row!.id;
  }

  it('only admin can list users', async () => {
    const nonAdmin = jwt.signAccess({ sub: 1, role: 'hr' });
    const r = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${nonAdmin}`);
    expect(r.status).toBe(403);
  });

  it('admin can list and patch', async () => {
    const adminId = await seedAdmin();
    const tok = jwt.signAccess({ sub: adminId, role: 'admin' });
    const list = await request(app).get('/api/users').set('Authorization', `Bearer ${tok}`);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);

    const other = await ctx.db
      .insert(users)
      .values({
        email: 'x@naratala.local',
        passwordHash: 'x',
        role: 'employee',
        status: 'active',
      })
      .$returningId();
    const patched = await request(app)
      .patch(`/api/users/${other[0]!.id}`)
      .set('Authorization', `Bearer ${tok}`)
      .send({ role: 'hr' });
    expect(patched.status).toBe(200);
    expect(patched.body.role).toBe('hr');
  });

  it('last-admin demotion is blocked', async () => {
    const adminId = await seedAdmin();
    const tok = jwt.signAccess({ sub: adminId, role: 'admin' });
    const r = await request(app)
      .patch(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${tok}`)
      .send({ role: 'employee' });
    expect(r.status).toBe(400);
  });

  it('self-disable is blocked', async () => {
    const adminId = await seedAdmin();
    const tok = jwt.signAccess({ sub: adminId, role: 'admin' });
    const r = await request(app)
      .patch(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${tok}`)
      .send({ status: 'disabled' });
    expect(r.status).toBe(400);
  });
});
