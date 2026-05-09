import { describe, it, expect } from 'vitest';
import { ROLES, ROLE_PERMISSIONS, hasPermission, type Permission } from './permissions.js';

describe('permissions', () => {
  it('lists all four roles', () => {
    expect(ROLES).toEqual(['admin', 'hr', 'manager', 'employee']);
  });

  it('admin holds every defined permission', () => {
    const all: Permission[] = [
      'employees:read:any',
      'employees:read:salary:any',
      'employees:read:self',
      'employees:read:salary:reports',
      'employees:write:any',
      'employees:write:salary',
      'users:read',
      'users:write',
      'invites:manage',
      'departments:manage',
      'audit:read',
    ];
    for (const p of all) expect(hasPermission('admin', p)).toBe(true);
  });

  it('hr cannot read audit and cannot manage users', () => {
    expect(hasPermission('hr', 'audit:read')).toBe(false);
    expect(hasPermission('hr', 'users:write')).toBe(false);
  });

  it('manager has report-scoped salary read but not any', () => {
    expect(hasPermission('manager', 'employees:read:salary:reports')).toBe(true);
    expect(hasPermission('manager', 'employees:read:salary:any')).toBe(false);
  });

  it('employee has self read but no write', () => {
    expect(hasPermission('employee', 'employees:read:self')).toBe(true);
    expect(hasPermission('employee', 'employees:write:any')).toBe(false);
  });

  it('ROLE_PERMISSIONS has an entry for every role', () => {
    for (const r of ROLES) expect(ROLE_PERMISSIONS[r]).toBeDefined();
  });

  it('grants absence permissions per role spec', () => {
    expect(hasPermission('admin', 'absence:configure')).toBe(true);
    expect(hasPermission('hr', 'absence:configure')).toBe(true);
    expect(hasPermission('hr', 'absence:approve:any')).toBe(true);
    expect(hasPermission('manager', 'absence:approve:reports')).toBe(true);
    expect(hasPermission('manager', 'absence:approve:any')).toBe(false);
    expect(hasPermission('employee', 'absence:write:self')).toBe(true);
    expect(hasPermission('employee', 'absence:read:any')).toBe(false);
  });

  it('payroll:read:any — admin and hr only', () => {
    expect(hasPermission('admin', 'payroll:read:any')).toBe(true);
    expect(hasPermission('hr', 'payroll:read:any')).toBe(true);
    expect(hasPermission('manager', 'payroll:read:any')).toBe(false);
    expect(hasPermission('employee', 'payroll:read:any')).toBe(false);
  });

  it('payroll:read:self — all roles', () => {
    expect(hasPermission('admin', 'payroll:read:self')).toBe(true);
    expect(hasPermission('hr', 'payroll:read:self')).toBe(true);
    expect(hasPermission('manager', 'payroll:read:self')).toBe(true);
    expect(hasPermission('employee', 'payroll:read:self')).toBe(true);
  });

  it('payroll:manage — admin and hr only', () => {
    expect(hasPermission('admin', 'payroll:manage')).toBe(true);
    expect(hasPermission('hr', 'payroll:manage')).toBe(true);
    expect(hasPermission('manager', 'payroll:manage')).toBe(false);
    expect(hasPermission('employee', 'payroll:manage')).toBe(false);
  });
});
