import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createJwtService } from '../auth/jwt.js';
import { createAuditRepo } from './auditRepo.js';
import { createAuditService } from './auditService.js';
import { createAuditRouter } from './auditRoutes.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';

describe('audit GET', () => {
  let ctx: TestDb;
  let app: express.Express;
  const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });

  beforeAll(async () => {
    ctx = await createTestDb();
    const repo = createAuditRepo(ctx.db);
    const svc = createAuditService(repo);
    app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/audit', createAuditRouter({ service: svc, jwt }));
    app.use(errorHandler());
    await repo.write({
      actorUserId: 1,
      actorIp: '127.0.0.1',
      action: 'employee.salary.update',
      entityType: 'employee',
      entityId: 7,
      changes: {
        before: { salaryAmount: '10' },
        after: { salaryAmount: '20' },
        reason: 'merit',
      },
    });
  });
  afterAll(async () => {
    await ctx.drop();
  });

  it('admin gets unredacted salaries', async () => {
    const tok = jwt.signAccess({ sub: 1, role: 'admin' });
    const r = await request(app).get('/api/audit').set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(200);
    expect(r.body.data[0].changes.after.salaryAmount).toBe('20');
  });

  it('non-admin/hr cannot access audit (403)', async () => {
    const tok = jwt.signAccess({ sub: 1, role: 'manager' });
    const r = await request(app).get('/api/audit').set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(403);
  });
});
