import { describe, it, expect } from 'vitest';
import {
  LoginBody,
  MfaVerifyBody,
  EmployeeCreate,
  EmployeeUpdate,
  InviteCreateBody,
  AcceptInviteBody,
  DepartmentCreate,
  UserUpdate,
  PasswordChangeBody,
  PasswordResetBody,
  PasswordForgotBody,
} from './index.js';

describe('auth schemas', () => {
  it('LoginBody requires email + password', () => {
    expect(LoginBody.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(LoginBody.safeParse({ email: 'a@b.co' }).success).toBe(false);
    expect(LoginBody.safeParse({ email: 'not-email', password: 'x' }).success).toBe(false);
  });

  it('LoginBody lowercases email', () => {
    const r = LoginBody.parse({ email: 'A@B.CO', password: 'x' });
    expect(r.email).toBe('a@b.co');
  });

  it('MfaVerifyBody requires a 6-digit code', () => {
    expect(MfaVerifyBody.safeParse({ code: '123456' }).success).toBe(true);
    expect(MfaVerifyBody.safeParse({ code: '12a456' }).success).toBe(false);
  });

  it('PasswordChangeBody requires ≥10 char newPassword', () => {
    expect(
      PasswordChangeBody.safeParse({ currentPassword: 'abc', newPassword: 'tooshort' }).success,
    ).toBe(false);
    expect(
      PasswordChangeBody.safeParse({ currentPassword: 'abc', newPassword: 'abcdefghij' }).success,
    ).toBe(true);
  });

  it('PasswordResetBody + PasswordForgotBody', () => {
    expect(PasswordResetBody.safeParse({ token: 'tttttttttt', newPassword: 'abcdefghij' }).success).toBe(
      true,
    );
    expect(PasswordForgotBody.safeParse({ email: 'a@b.co' }).success).toBe(true);
  });
});

describe('employee schemas', () => {
  const baseCreate = {
    fullName: 'Ayu Wulan',
    email: 'ayu@naratala.local',
    departmentId: 1,
    position: 'Engineer',
    employmentType: 'full_time',
    hireDate: '2025-01-15',
  };

  it('EmployeeCreate requires core fields', () => {
    expect(EmployeeCreate.safeParse(baseCreate).success).toBe(true);
    expect(EmployeeCreate.safeParse({ ...baseCreate, employmentType: 'nope' }).success).toBe(false);
    expect(EmployeeCreate.safeParse({ ...baseCreate, hireDate: 'not-date' }).success).toBe(false);
  });

  it('EmployeeCreate accepts optional salary_amount/currency', () => {
    const r = EmployeeCreate.parse({
      ...baseCreate,
      salaryAmount: '12345.67',
      salaryCurrency: 'IDR',
    });
    expect(r.salaryAmount).toBe('12345.67');
    expect(r.salaryCurrency).toBe('IDR');
  });

  it('EmployeeUpdate: if salaryAmount present, reason must be ≥10 chars', () => {
    expect(EmployeeUpdate.safeParse({ salaryAmount: '100' }).success).toBe(false);
    expect(EmployeeUpdate.safeParse({ salaryAmount: '100', reason: 'short' }).success).toBe(false);
    expect(
      EmployeeUpdate.safeParse({ salaryAmount: '100', reason: 'promotion approved' }).success,
    ).toBe(true);
  });
});

describe('invite + user + department schemas', () => {
  it('InviteCreateBody', () => {
    expect(InviteCreateBody.safeParse({ employeeId: 1, role: 'manager' }).success).toBe(true);
    expect(InviteCreateBody.safeParse({ employeeId: 1, role: 'root' }).success).toBe(false);
  });

  it('AcceptInviteBody', () => {
    expect(AcceptInviteBody.safeParse({ password: 'abcdefghij' }).success).toBe(true);
    expect(AcceptInviteBody.safeParse({ password: 'short' }).success).toBe(false);
  });

  it('DepartmentCreate', () => {
    expect(DepartmentCreate.safeParse({ name: 'Engineering' }).success).toBe(true);
    expect(DepartmentCreate.safeParse({ name: '' }).success).toBe(false);
  });

  it('UserUpdate restricts role + status', () => {
    expect(UserUpdate.safeParse({ role: 'manager' }).success).toBe(true);
    expect(UserUpdate.safeParse({ role: 'root' }).success).toBe(false);
    expect(UserUpdate.safeParse({ status: 'disabled' }).success).toBe(true);
    expect(UserUpdate.safeParse({}).success).toBe(true);
  });
});

import {
  LeaveType,
  LeaveRequestCreate,
  LeaveDecisionBody,
  HolidayCreate,
  WorkingScheduleUpdate,
} from './absence.js';

describe('absence schemas', () => {
  it('LeaveType enum', () => {
    expect(LeaveType.options).toContain('vacation');
    expect(LeaveType.options).toContain('unpaid');
  });

  it('LeaveRequestCreate accepts valid input', () => {
    const r = LeaveRequestCreate.parse({
      leaveType: 'vacation',
      fromDate: '2026-05-04',
      toDate: '2026-05-08',
    });
    expect(r.leaveType).toBe('vacation');
  });

  it('LeaveRequestCreate rejects to<from', () => {
    expect(() =>
      LeaveRequestCreate.parse({
        leaveType: 'vacation',
        fromDate: '2026-05-08',
        toDate: '2026-05-04',
      }),
    ).toThrow();
  });

  it('HolidayCreate validates date format', () => {
    expect(() => HolidayCreate.parse({ date: 'bad', label: 'X' })).toThrow();
    expect(HolidayCreate.parse({ date: '2026-05-01', label: 'Labor Day' }).label).toBe('Labor Day');
  });

  it('WorkingScheduleUpdate clamps to 0–127', () => {
    expect(WorkingScheduleUpdate.parse({ workingDays: 62 }).workingDays).toBe(62);
    expect(() => WorkingScheduleUpdate.parse({ workingDays: 256 })).toThrow();
  });

  it('LeaveDecisionBody allows empty + note', () => {
    expect(LeaveDecisionBody.parse({}).note).toBeUndefined();
    expect(LeaveDecisionBody.parse({ note: 'ok' }).note).toBe('ok');
  });
});
