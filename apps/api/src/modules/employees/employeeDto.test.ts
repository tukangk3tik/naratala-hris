import { describe, it, expect } from 'vitest';
import { toEmployeeDTO, type SalaryScope } from './employeeDto.js';
import type { EmployeeRow } from './employeeRepo.js';

const row: EmployeeRow = {
  id: 7,
  userId: null,
  fullName: 'Ayu Wulan',
  email: 'ayu@naratala.local',
  phone: null,
  pronouns: null,
  departmentId: 1,
  departmentName: 'Engineering',
  position: 'Engineer',
  location: null,
  employmentType: 'full_time',
  employmentStatus: 'active',
  hireDate: '2025-01-15',
  managerId: null,
  salaryAmount: '12345.67',
  salaryCurrency: 'IDR',
  avatarColorHue: 120,
  createdAt: new Date('2025-01-15T10:00:00Z'),
  updatedAt: new Date('2025-01-15T10:00:00Z'),
  deletedAt: null,
};

describe('toEmployeeDTO', () => {
  it('includes salary when scope is visible', () => {
    const dto = toEmployeeDTO(row, 'visible' satisfies SalaryScope);
    expect(dto.salaryAmount).toBe('12345.67');
  });

  it('strips salary when scope is hidden', () => {
    const dto = toEmployeeDTO(row, 'hidden' satisfies SalaryScope);
    expect(dto.salaryAmount).toBeNull();
    expect(dto.salaryCurrency).toBe('IDR');
  });

  it('emits ISO strings for timestamps', () => {
    const dto = toEmployeeDTO(row, 'hidden');
    expect(dto.createdAt).toBe('2025-01-15T10:00:00.000Z');
  });
});
