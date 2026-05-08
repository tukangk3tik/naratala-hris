import type { UserDTO, EmployeeDTO, DepartmentDTO } from '@naratala/shared';

export const adminUser: UserDTO = {
  id: 1,
  email: 'admin@naratala.local',
  role: 'admin',
  status: 'active',
  language: 'en',
  mfaEnabled: false,
  mustChangePassword: false,
  lastLoginAt: '2026-04-28T00:00:00.000Z',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-28T00:00:00.000Z',
};

export const employeeUser: UserDTO = {
  ...adminUser,
  id: 2,
  email: 'emp@naratala.local',
  role: 'employee',
};
export const hrUser: UserDTO = { ...adminUser, id: 3, email: 'hr@naratala.local', role: 'hr' };
export const managerUser: UserDTO = {
  ...adminUser,
  id: 4,
  email: 'mgr@naratala.local',
  role: 'manager',
};

export const dept: DepartmentDTO = {
  id: 1,
  name: 'Engineering',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

export const sampleEmployee: EmployeeDTO = {
  id: 10,
  userId: 2,
  fullName: 'Sample Person',
  email: 'sample@naratala.local',
  phone: null,
  pronouns: null,
  departmentId: 1,
  departmentName: 'Engineering',
  position: 'Engineer',
  location: null,
  employmentType: 'full_time',
  employmentStatus: 'active',
  hireDate: '2024-01-01',
  managerId: null,
  avatarColorHue: 12,
  salaryAmount: '15000000.00',
  salaryCurrency: 'IDR',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};
