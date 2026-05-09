import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createBalanceService } from './balanceService.js';
import { createLeaveQuotaService } from './leaveQuotaService.js';
import { createLeaveQuotaRepo } from './leaveQuotaRepo.js';
import { createLeavePolicyRepo } from './leavePolicyRepo.js';
import { departments, employees, leaveRequests } from '../../shared/db/schema.js';

describe('balanceService', () => {
  let ctx: TestDb;
  let svc: ReturnType<typeof createBalanceService>;
  let empId = 0;

  beforeAll(async () => {
    ctx = await createTestDb();
    const [d] = await ctx.db.insert(departments).values({ name: 'X' }).$returningId();
    const [e] = await ctx.db
      .insert(employees)
      .values({
        fullName: 'A',
        email: 'a@n.local',
        departmentId: d!.id,
        position: 'p',
        employmentType: 'full_time',
        hireDate: '2024-01-01',
        avatarColorHue: 1,
      })
      .$returningId();
    empId = e!.id;
    svc = createBalanceService({
      db: ctx.db,
      quotas: createLeaveQuotaService({
        quotas: createLeaveQuotaRepo(ctx.db),
        policies: createLeavePolicyRepo(ctx.db),
      }),
    });
    await ctx.db.insert(leaveRequests).values([
      {
        employeeId: empId,
        actorUserId: 1,
        leaveType: 'vacation',
        fromDate: '2026-01-05',
        toDate: '2026-01-09',
        days: '5.00',
        status: 'approved',
      },
      {
        employeeId: empId,
        actorUserId: 1,
        leaveType: 'vacation',
        fromDate: '2026-06-01',
        toDate: '2026-06-03',
        days: '3.00',
        status: 'pending',
      },
      {
        employeeId: empId,
        actorUserId: 1,
        leaveType: 'vacation',
        fromDate: '2025-06-01',
        toDate: '2025-06-03',
        days: '3.00',
        status: 'approved',
      },
    ]);
  });
  afterAll(async () => {
    await ctx.drop();
  });

  it('computes quota/used/pending/available for the year', async () => {
    const b = await svc.balanceFor(empId, 2026, 'vacation');
    expect(b.quota).toBe(20);
    expect(b.used).toBe(5);
    expect(b.pending).toBe(3);
    expect(b.available).toBe(12);
  });

  it('all 6 leave types in summary list', async () => {
    const all = await svc.summary(empId, 2026);
    expect(all.length).toBe(6);
  });
});
