import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createTestDb, type TestDb } from '../../test/db.js';
import { employees } from '../../shared/db/schema.js';
import { createJwtService } from '../auth/jwt.js';
import { createDepartmentRepo } from './departmentRepo.js';
import { createDepartmentService } from './departmentService.js';
import { createDepartmentRouter } from './departmentRoutes.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';

describe('departments', () => {
  let ctx: TestDb;
  let app: express.Express;
  const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });

  beforeAll(async () => {
    ctx = await createTestDb();
    const svc = createDepartmentService(createDepartmentRepo(ctx.db));
    app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/departments', createDepartmentRouter({ service: svc, jwt }));
    app.use(errorHandler());
  });
  afterAll(async () => {
    await ctx.drop();
  });
  beforeEach(async () => {
    await ctx.truncateAll();
  });

  function tokenFor(role: 'admin' | 'hr' | 'manager' | 'employee') {
    return jwt.signAccess({ sub: 1, role });
  }

  it('GET is available to any authed user', async () => {
    const r = await request(app)
      .get('/api/departments')
      .set('Authorization', `Bearer ${tokenFor('employee')}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data)).toBe(true);
  });

  it('POST/PATCH/DELETE require departments:manage', async () => {
    const empTok = tokenFor('employee');
    const r1 = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${empTok}`)
      .send({ name: 'Eng' });
    expect(r1.status).toBe(403);
  });

  it('admin round-trip: create → update → delete', async () => {
    const tok = tokenFor('admin');
    const created = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${tok}`)
      .send({ name: 'Ops' });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const updated = await request(app)
      .patch(`/api/departments/${id}`)
      .set('Authorization', `Bearer ${tok}`)
      .send({ name: 'Operations' });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Operations');

    const del = await request(app)
      .delete(`/api/departments/${id}`)
      .set('Authorization', `Bearer ${tok}`);
    expect(del.status).toBe(200);
  });

  it('DELETE blocked when employees reference the department', async () => {
    const tok = tokenFor('admin');
    const created = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${tok}`)
      .send({ name: 'Ops' });
    const id = created.body.id as number;
    await ctx.db.insert(employees).values({
      fullName: 'A',
      email: 'a@x.co',
      departmentId: id,
      position: 'p',
      employmentType: 'full_time',
      hireDate: '2025-01-01',
      avatarColorHue: 10,
    });
    const del = await request(app)
      .delete(`/api/departments/${id}`)
      .set('Authorization', `Bearer ${tok}`);
    expect(del.status).toBe(400);
    expect(del.body.code).toBe('VALIDATION_FAILED');
  });
});
