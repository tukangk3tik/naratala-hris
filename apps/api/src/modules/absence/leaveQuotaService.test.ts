import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createLeaveQuotaRepo } from './leaveQuotaRepo.js';
import { createLeavePolicyRepo } from './leavePolicyRepo.js';
import { createLeaveQuotaService } from './leaveQuotaService.js';
import { departments, employees } from '../../shared/db/schema.js';

describe('leaveQuotaService', () => {
  let ctx: TestDb;
  let svc: ReturnType<typeof createLeaveQuotaService>;
  let empId = 0;

  beforeAll(async () => {
    ctx = await createTestDb();
    svc = createLeaveQuotaService({
      quotas: createLeaveQuotaRepo(ctx.db),
      policies: createLeavePolicyRepo(ctx.db),
    });
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
  });
  afterAll(async () => {
    await ctx.drop();
  });

  it('falls back to policy default', async () => {
    expect(await svc.quotaFor(empId, 'vacation')).toBe(20);
  });

  it('override wins', async () => {
    await svc.upsertOverride(empId, 'vacation', 25);
    expect(await svc.quotaFor(empId, 'vacation')).toBe(25);
  });

  it('removeOverride reverts to default', async () => {
    await svc.removeOverride(empId, 'vacation');
    expect(await svc.quotaFor(empId, 'vacation')).toBe(20);
  });

  it('listForEmployee returns only overrides', async () => {
    await svc.upsertOverride(empId, 'sick', 12);
    const list = await svc.listForEmployee(empId);
    expect(list.find((q) => q.leaveType === 'sick')?.daysPerYear).toBe('12.00');
  });
});
