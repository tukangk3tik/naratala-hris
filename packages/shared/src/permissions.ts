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
  | 'audit:read';

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
  ],
  hr: [
    'employees:read:any',
    'employees:read:salary:any',
    'employees:read:self',
    'employees:write:any',
    'employees:write:salary',
    'invites:manage',
    'departments:manage',
  ],
  manager: [
    'employees:read:any',
    'employees:read:salary:reports',
    'employees:read:self',
  ],
  employee: ['employees:read:any', 'employees:read:self'],
};

export function hasPermission(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(perm);
}
