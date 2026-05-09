export const ROLES = ['admin', 'hr', 'manager', 'employee'] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | 'employees:read:any'
  | 'employees:read:salary:any'
  | 'employees:read:self'
  | 'employees:read:salary:reports'
  | 'employees:write:any'
  | 'employees:write:salary'
  | 'users:read'
  | 'users:write'
  | 'invites:manage'
  | 'departments:manage'
  | 'audit:read'
  | 'absence:read:self'
  | 'absence:read:reports'
  | 'absence:read:any'
  | 'absence:write:self'
  | 'absence:write:any'
  | 'absence:approve:reports'
  | 'absence:approve:any'
  | 'absence:configure'
  | 'payroll:read:any'
  | 'payroll:read:self'
  | 'payroll:manage';

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: [
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
    'absence:read:self',
    'absence:read:reports',
    'absence:read:any',
    'absence:write:self',
    'absence:write:any',
    'absence:approve:reports',
    'absence:approve:any',
    'absence:configure',
    'payroll:read:any',
    'payroll:read:self',
    'payroll:manage',
  ],
  hr: [
    'employees:read:any',
    'employees:read:salary:any',
    'employees:read:self',
    'employees:write:any',
    'employees:write:salary',
    'invites:manage',
    'departments:manage',
    'absence:read:self',
    'absence:read:reports',
    'absence:read:any',
    'absence:write:self',
    'absence:write:any',
    'absence:approve:any',
    'absence:configure',
    'payroll:read:any',
    'payroll:read:self',
    'payroll:manage',
  ],
  manager: [
    'employees:read:any',
    'employees:read:salary:reports',
    'employees:read:self',
    'absence:read:self',
    'absence:read:reports',
    'absence:write:self',
    'absence:write:any',
    'absence:approve:reports',
    'payroll:read:self',
  ],
  employee: [
    'employees:read:any',
    'employees:read:self',
    'absence:read:self',
    'absence:write:self',
    'payroll:read:self',
  ],
};

export function hasPermission(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(perm);
}
