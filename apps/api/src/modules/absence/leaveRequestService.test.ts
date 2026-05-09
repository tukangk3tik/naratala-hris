import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createLeaveRequestRepo } from './leaveRequestRepo.js';
import { createLeaveRequestService } from './leaveRequestService.js';
import { createHolidayRepo } from './holidayRepo.js';
import { createHolidayService } from './holidayService.js';
import { createWorkingScheduleRepo } from './workingScheduleRepo.js';
import { createWorkingScheduleService } from './workingScheduleService.js';
import { createUserRepo } from '../auth/userRepo.js';
import { createEmployeeRepo } from '../employees/employeeRepo.js';
import { createAuditRepo } from '../audit/auditRepo.js';
import { departments, employees, users } from '../../shared/db/schema.js';
import { hashPassword } from '../auth/password.js';
import { ForbiddenError } from '../../shared/errors/index.js';

const noopMailer = { send: vi.fn(async () => ({ ok: true })) };

async function buildSvc(ctx: TestDb) {
  return createLeaveRequestService({
    db: ctx.db,
    requests: createLeaveRequestRepo(ctx.db),
    holidays: createHolidayService(createHolidayRepo(ctx.db)),
    schedule: createWorkingScheduleService(createWorkingScheduleRepo(ctx.db)),
    users: createUserRepo(ctx.db),
    employees: createEmployeeRepo(ctx.db),
    audit: createAuditRepo(ctx.db),
    mailer: noopMailer,
  });
}

describe('leaveRequestService', () => {
  let ctx: TestDb;
  let svc: Awaited<ReturnType<typeof buildSvc>>;
  let empUserId = 0;
  let empId = 0;
  let mgrUserId = 0;
  let mgrEmpId = 0;

  beforeAll(async () => {
    ctx = await createTestDb();
    const hash = await hashPassword('correct-horse-12');
    const [emp] = await ctx.db
      .insert(users)
      .values({ email: 'e@n.local', passwordHash: hash, role: 'employee', status: 'active' })
      .$returningId();
    empUserId = emp!.id;
    const [mgr] = await ctx.db
      .insert(users)
      .values({ email: 'm@n.local', passwordHash: hash, role: 'manager', status: 'active' })
      .$returningId();
    mgrUserId = mgr!.id;
    const [d] = await ctx.db.insert(departments).values({ name: 'D' }).$returningId();
    const [mgrEmp] = await ctx.db
      .insert(employees)
      .values({
        userId: mgrUserId,
        fullName: 'Mgr',
        email: 'mgr@n.local',
        departmentId: d!.id,
        position: 'M',
        employmentType: 'full_time',
        hireDate: '2024-01-01',
        avatarColorHue: 1,
      })
      .$returningId();
    mgrEmpId = mgrEmp!.id;
    const [e] = await ctx.db
      .insert(employees)
      .values({
        userId: empUserId,
        fullName: 'Emp',
        email: 'emp@n.local',
        departmentId: d!.id,
        managerId: mgrEmpId,
        position: 'P',
        employmentType: 'full_time',
        hireDate: '2024-01-01',
        avatarColorHue: 2,
      })
      .$returningId();
    empId = e!.id;
    svc = await buildSvc(ctx);
  });
  afterAll(async () => {
    await ctx.drop();
  });

  it('submit happy path: pending, days computed, mail sent', async () => {
    noopMailer.send.mockClear();
    const r = await svc.submit(
      { userId: empUserId, role: 'employee', employeeId: empId, ip: 'x' },
      { leaveType: 'vacation', fromDate: '2026-05-04', toDate: '2026-05-08' },
    );
    expect(r.status).toBe('pending');
    expect(r.days).toBe('5.00');
    expect(noopMailer.send).toHaveBeenCalled();
  });

  it('manager-on-behalf auto-approves', async () => {
    const r = await svc.submit(
      { userId: mgrUserId, role: 'manager', employeeId: mgrEmpId, ip: 'x' },
      { employeeId: empId, leaveType: 'sick', fromDate: '2026-06-01', toDate: '2026-06-01' },
    );
    expect(r.status).toBe('approved');
  });

  it('zero working days → 400 LEAVE_ZERO_DAYS', async () => {
    await expect(
      svc.submit(
        { userId: empUserId, role: 'employee', employeeId: empId, ip: 'x' },
        { leaveType: 'vacation', fromDate: '2026-05-09', toDate: '2026-05-10' },
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED', message: expect.stringMatching(/zero/i) });
  });

  it('cancel approved-future succeeds', async () => {
    const r = await svc.submit(
      { userId: mgrUserId, role: 'manager', employeeId: mgrEmpId, ip: 'x' },
      { employeeId: empId, leaveType: 'personal', fromDate: '2099-01-05', toDate: '2099-01-05' },
    );
    const cancelled = await svc.cancel(
      { userId: empUserId, role: 'employee', employeeId: empId, ip: 'x' },
      r.id,
    );
    expect(cancelled.status).toBe('cancelled');
  });

  it('cancel approved-past returns LEAVE_ALREADY_STARTED', async () => {
    const r = await svc.submit(
      { userId: mgrUserId, role: 'manager', employeeId: mgrEmpId, ip: 'x' },
      { employeeId: empId, leaveType: 'personal', fromDate: '2020-01-06', toDate: '2020-01-06' },
    );
    await expect(
      svc.cancel({ userId: empUserId, role: 'employee', employeeId: empId, ip: 'x' }, r.id),
    ).rejects.toMatchObject({ message: expect.stringMatching(/already started/i) });
  });

  it('manager cannot approve for non-report', async () => {
    const otherUser = (await ctx.db
      .insert(users)
      .values({ email: 'o@n.local', passwordHash: 'x', role: 'employee', status: 'active' })
      .$returningId())[0]!;
    const otherDept = (await ctx.db.insert(departments).values({ name: 'O' }).$returningId())[0]!;
    const otherEmp = (await ctx.db
      .insert(employees)
      .values({
        userId: otherUser.id,
        fullName: 'Other',
        email: 'other@n.local',
        departmentId: otherDept.id,
        position: 'P',
        employmentType: 'full_time',
        hireDate: '2024-01-01',
        avatarColorHue: 9,
      })
      .$returningId())[0]!;
    const r = await svc.submit(
      { userId: otherUser.id, role: 'employee', employeeId: otherEmp.id, ip: 'x' },
      { leaveType: 'vacation', fromDate: '2026-07-06', toDate: '2026-07-06' },
    );
    await expect(
      svc.approve({ userId: mgrUserId, role: 'manager', employeeId: mgrEmpId, ip: 'x' }, r.id, {}),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
