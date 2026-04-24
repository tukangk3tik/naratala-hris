import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { eq, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../test/db.js';
import { departments, employees as empTable, users } from '../../shared/db/schema.js';
import { createJwtService } from '../auth/jwt.js';
import { createUserRepo } from '../auth/userRepo.js';
import { createRefreshTokenRepo } from '../auth/refreshTokenRepo.js';
import { createRefreshTokenService } from '../auth/refreshTokenService.js';
import { createEmployeeRepo } from './employeeRepo.js';
import { createEmployeeService } from './employeeService.js';
import { createEmployeeRouter } from './employeeRoutes.js';
import { createAuditRepo } from '../audit/auditRepo.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';

describe('employees', () => {
  let ctx: TestDb;
  let app: express.Express;
  const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });

  beforeAll(async () => {
    ctx = await createTestDb();
    const userRepo = createUserRepo(ctx.db);
    const refresh = createRefreshTokenService({
      repo: createRefreshTokenRepo(ctx.db),
      ttlMs: 30 * 86400000,
    });
    const svc = createEmployeeService({
      employees: createEmployeeRepo(ctx.db),
      users: userRepo,
      audit: createAuditRepo(ctx.db),
      refresh,
    });
    app = express();
    app.set('trust proxy', 1);
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/employees', createEmployeeRouter({ service: svc, jwt }));
    app.use(errorHandler());
  });
  afterAll(async () => {
    await ctx.drop();
  });
  beforeEach(async () => {
    await ctx.truncateAll();
  });

  async function setup() {
    const [dep] = await ctx.db.insert(departments).values({ name: 'Eng' }).$returningId();

    const [mgrUser] = await ctx.db
      .insert(users)
      .values({
        email: 'm@x.co',
        passwordHash: 'x',
        role: 'manager',
        status: 'active',
      })
      .$returningId();
    const [mgrEmp] = await ctx.db
      .insert(empTable)
      .values({
        userId: mgrUser!.id,
        fullName: 'Mgr Ana',
        email: 'mgr@x.co',
        departmentId: dep!.id,
        position: 'Manager',
        employmentType: 'full_time',
        hireDate: '2020-01-01',
        avatarColorHue: 120,
      })
      .$returningId();

    const [reportEmp] = await ctx.db
      .insert(empTable)
      .values({
        fullName: 'Rep Bob',
        email: 'rep@x.co',
        departmentId: dep!.id,
        position: 'Engineer',
        employmentType: 'full_time',
        hireDate: '2023-01-01',
        salaryAmount: '20000.00',
        avatarColorHue: 80,
        managerId: mgrEmp!.id,
      })
      .$returningId();

    const [otherEmp] = await ctx.db
      .insert(empTable)
      .values({
        fullName: 'Oth Carol',
        email: 'oth@x.co',
        departmentId: dep!.id,
        position: 'Engineer',
        employmentType: 'full_time',
        hireDate: '2023-01-01',
        salaryAmount: '30000.00',
        avatarColorHue: 200,
      })
      .$returningId();

    return { dep: dep!, mgrUser: mgrUser!, mgrEmp: mgrEmp!, reportEmp: reportEmp!, otherEmp: otherEmp! };
  }

  async function admin() {
    const [u] = await ctx.db
      .insert(users)
      .values({ email: 'a@x.co', passwordHash: 'x', role: 'admin', status: 'active' })
      .$returningId();
    return jwt.signAccess({ sub: u!.id, role: 'admin' });
  }

  it('list: admin sees all salaries; manager sees only direct-report salaries', async () => {
    const { mgrUser, reportEmp, otherEmp } = await setup();
    const adminTok = await admin();
    const mgrTok = jwt.signAccess({ sub: mgrUser.id, role: 'manager' });

    const asAdmin = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${adminTok}`);
    expect(asAdmin.status).toBe(200);
    const adminSalaries = Object.fromEntries(
      asAdmin.body.data.map((r: { id: number; salaryAmount: string | null }) => [
        r.id,
        r.salaryAmount,
      ]),
    );
    expect(adminSalaries[reportEmp.id]).toBe('20000.00');
    expect(adminSalaries[otherEmp.id]).toBe('30000.00');

    const asMgr = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${mgrTok}`);
    const mgrSalaries = Object.fromEntries(
      asMgr.body.data.map((r: { id: number; salaryAmount: string | null }) => [
        r.id,
        r.salaryAmount,
      ]),
    );
    expect(mgrSalaries[reportEmp.id]).toBe('20000.00');
    expect(mgrSalaries[otherEmp.id]).toBeNull();
  });

  it('detail: employee sees only their own salary', async () => {
    const { dep, otherEmp } = await setup();
    const [selfUser] = await ctx.db
      .insert(users)
      .values({
        email: 'self@x.co',
        passwordHash: 'x',
        role: 'employee',
        status: 'active',
      })
      .$returningId();
    const [selfEmp] = await ctx.db
      .insert(empTable)
      .values({
        userId: selfUser!.id,
        fullName: 'Self Dee',
        email: 'self@x.co',
        departmentId: dep.id,
        position: 'Engineer',
        employmentType: 'full_time',
        hireDate: '2024-01-01',
        salaryAmount: '15000.00',
        avatarColorHue: 300,
      })
      .$returningId();

    const tok = jwt.signAccess({ sub: selfUser!.id, role: 'employee' });
    const myself = await request(app)
      .get(`/api/employees/${selfEmp!.id}`)
      .set('Authorization', `Bearer ${tok}`);
    expect(myself.body.salaryAmount).toBe('15000.00');

    const someoneElse = await request(app)
      .get(`/api/employees/${otherEmp.id}`)
      .set('Authorization', `Bearer ${tok}`);
    expect(someoneElse.status).toBe(200);
    expect(someoneElse.body.salaryAmount).toBeNull();
  });

  it('PATCH salary requires reason + audit + write:salary', async () => {
    const { otherEmp } = await setup();
    const adminTok = await admin();

    const missingReason = await request(app)
      .patch(`/api/employees/${otherEmp.id}`)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ salaryAmount: '35000.00' });
    expect(missingReason.status).toBe(400);

    const ok = await request(app)
      .patch(`/api/employees/${otherEmp.id}`)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ salaryAmount: '35000.00', reason: 'merit increase approved' });
    expect(ok.status).toBe(200);
    expect(ok.body.salaryAmount).toBe('35000.00');

    const audits = await ctx.db.execute<{ action: string }>(
      sql`SELECT action FROM audit_log WHERE action = 'employee.salary.update' LIMIT 1`,
    );
    const arr = Array.isArray(audits) ? audits[0] : audits;
    const first = Array.isArray(arr) ? arr[0] : arr;
    expect(first).toBeDefined();
  });

  it('DELETE restricted to admin; soft-deletes + disables linked user', async () => {
    const { mgrUser, mgrEmp } = await setup();
    const adminTok = await admin();
    const del = await request(app)
      .delete(`/api/employees/${mgrEmp.id}`)
      .set('Authorization', `Bearer ${adminTok}`);
    expect(del.status).toBe(200);

    const [deletedEmp] = await ctx.db.select().from(empTable).where(eq(empTable.id, mgrEmp.id));
    expect(deletedEmp!.deletedAt).not.toBeNull();

    const [user] = await ctx.db.select().from(users).where(eq(users.id, mgrUser.id));
    expect(user!.status).toBe('disabled');
  });

  it('non-admin cannot DELETE', async () => {
    const { mgrUser, mgrEmp } = await setup();
    const tok = jwt.signAccess({ sub: mgrUser.id, role: 'manager' });
    const r = await request(app)
      .delete(`/api/employees/${mgrEmp.id}`)
      .set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(403);
  });
});
