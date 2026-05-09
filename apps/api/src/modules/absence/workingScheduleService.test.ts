import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createWorkingScheduleRepo } from './workingScheduleRepo.js';
import { createWorkingScheduleService } from './workingScheduleService.js';
import { departments, employees } from '../../shared/db/schema.js';

describe('workingScheduleService', () => {
  let ctx: TestDb;
  let svc: ReturnType<typeof createWorkingScheduleService>;
  let empId = 0;

  beforeAll(async () => {
    ctx = await createTestDb();
    svc = createWorkingScheduleService(createWorkingScheduleRepo(ctx.db));
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

  it('default is company default when no override', async () => {
    expect(await svc.workingDaysFor(empId)).toBe(62);
  });

  it('override wins', async () => {
    await svc.setEmployeeOverride(empId, 127);
    expect(await svc.workingDaysFor(empId)).toBe(127);
  });

  it('null clears override', async () => {
    await svc.setEmployeeOverride(empId, null);
    expect(await svc.workingDaysFor(empId)).toBe(62);
  });

  it('updateDefault changes the company-wide value', async () => {
    await svc.updateDefault(127);
    expect(await svc.workingDaysFor(empId)).toBe(127);
  });
});
