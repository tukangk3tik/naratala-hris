import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createPayRunRepo } from './payRunRepo.js';
import { createPayslipRepo } from './payslipRepo.js';
import { createPayrollRunService } from './payrollRunService.js';
import { createEmployeeRepo } from '../employees/employeeRepo.js';
import { createAuditRepo } from '../audit/auditRepo.js';
import { departments, employees, users } from '../../shared/db/schema.js';
import { hashPassword } from '../auth/password.js';

async function buildSvc(ctx: TestDb) {
  return createPayrollRunService({
    db: ctx.db,
    payRuns: createPayRunRepo(ctx.db),
    payslips: createPayslipRepo(ctx.db),
    employees: createEmployeeRepo(ctx.db),
    audit: createAuditRepo(ctx.db),
  });
}

describe('payrollRunService', () => {
  let ctx: TestDb;
  let svc: Awaited<ReturnType<typeof buildSvc>>;
  let adminUserId = 0;
  let empId = 0;

  beforeAll(async () => {
    ctx = await createTestDb();
    const hash = await hashPassword('x');

    const [admin] = await ctx.db
      .insert(users)
      .values({ email: 'a@p.local', passwordHash: hash, role: 'admin', status: 'active' })
      .$returningId();
    adminUserId = admin!.id;

    const [dept] = await ctx.db.insert(departments).values({ name: 'Eng' }).$returningId();

    const [e] = await ctx.db
      .insert(employees)
      .values({
        fullName: 'Alice',
        email: 'alice@p.local',
        departmentId: dept!.id,
        position: 'Engineer',
        employmentType: 'full_time',
        hireDate: '2024-01-01',
        avatarColorHue: 1,
        salaryAmount: '12000000.00',
        salaryCurrency: 'IDR',
        employmentStatus: 'active',
      })
      .$returningId();
    empId = e!.id;

    // Null-salary employee — should be skipped
    await ctx.db.insert(employees).values({
      fullName: 'Bob (no salary)',
      email: 'bob@p.local',
      departmentId: dept!.id,
      position: 'Intern',
      employmentType: 'intern',
      hireDate: '2024-01-01',
      avatarColorHue: 2,
      employmentStatus: 'active',
    });

    svc = await buildSvc(ctx);
  });

  afterAll(async () => { await ctx.drop(); });

  it('create: generates payslip for salary employee, skips null-salary', async () => {
    const run = await svc.create(
      { userId: adminUserId, role: 'admin', ip: 'x' },
      { name: 'May 2026', periodStart: '2026-05-01', periodEnd: '2026-05-31', currency: 'IDR' },
    );
    expect(run.status).toBe('draft');
    expect(run.payslips).toHaveLength(1);
    expect(run.payslips[0]!.employeeId).toBe(empId);
    expect(run.payslips[0]!.grossAmount).toBe('1000000.00');
    expect(run.payslips[0]!.netAmount).toBe('1000000.00');
    expect(run.payslips[0]!.salarySnapshot).toEqual({ amount: '12000000.00', currency: 'IDR' });
  });

  it('adjust: updates deduction + recomputes net', async () => {
    const run = await svc.create(
      { userId: adminUserId, role: 'admin', ip: 'x' },
      { name: 'Jun 2026', periodStart: '2026-06-01', periodEnd: '2026-06-30', currency: 'IDR' },
    );
    const payslipId = run.payslips[0]!.id;
    const updated = await svc.adjustPayslip(
      { userId: adminUserId, role: 'admin', ip: 'x' },
      payslipId,
      { deductionAmount: '100000.00' },
    );
    expect(updated.deductionAmount).toBe('100000.00');
    expect(updated.netAmount).toBe('900000.00');
  });

  it('finalize: totals computed, status locked', async () => {
    const run = await svc.create(
      { userId: adminUserId, role: 'admin', ip: 'x' },
      { name: 'Jul 2026', periodStart: '2026-07-01', periodEnd: '2026-07-31', currency: 'IDR' },
    );
    const finalized = await svc.finalize({ userId: adminUserId, role: 'admin', ip: 'x' }, run.id);
    expect(finalized.status).toBe('finalized');
    expect(finalized.headcount).toBe(1);
    expect(finalized.totalGross).toBe('1000000.00');
    expect(finalized.totalNet).toBe('1000000.00');
  });

  it('finalize: ValidationError if already finalized', async () => {
    const run = await svc.create(
      { userId: adminUserId, role: 'admin', ip: 'x' },
      { name: 'Aug 2026', periodStart: '2026-08-01', periodEnd: '2026-08-31', currency: 'IDR' },
    );
    await svc.finalize({ userId: adminUserId, role: 'admin', ip: 'x' }, run.id);
    await expect(
      svc.finalize({ userId: adminUserId, role: 'admin', ip: 'x' }, run.id),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('cancel: sets status to cancelled', async () => {
    const run = await svc.create(
      { userId: adminUserId, role: 'admin', ip: 'x' },
      { name: 'Sep 2026', periodStart: '2026-09-01', periodEnd: '2026-09-30', currency: 'IDR' },
    );
    await svc.cancel({ userId: adminUserId, role: 'admin', ip: 'x' }, run.id);
    const found = await createPayRunRepo(ctx.db).findById(run.id);
    expect(found?.status).toBe('cancelled');
  });

  it('cancel: ValidationError if finalized', async () => {
    const run = await svc.create(
      { userId: adminUserId, role: 'admin', ip: 'x' },
      { name: 'Oct 2026', periodStart: '2026-10-01', periodEnd: '2026-10-31', currency: 'IDR' },
    );
    await svc.finalize({ userId: adminUserId, role: 'admin', ip: 'x' }, run.id);
    await expect(
      svc.cancel({ userId: adminUserId, role: 'admin', ip: 'x' }, run.id),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('adjustPayslip: ValidationError if run is finalized', async () => {
    const run = await svc.create(
      { userId: adminUserId, role: 'admin', ip: 'x' },
      { name: 'Nov 2026', periodStart: '2026-11-01', periodEnd: '2026-11-30', currency: 'IDR' },
    );
    const payslipId = run.payslips[0]!.id;
    await svc.finalize({ userId: adminUserId, role: 'admin', ip: 'x' }, run.id);
    await expect(
      svc.adjustPayslip({ userId: adminUserId, role: 'admin', ip: 'x' }, payslipId, { deductionAmount: '50000.00' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});
