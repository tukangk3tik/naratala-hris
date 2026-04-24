import type { EmployeeDTO, Role } from '@naratala/shared';
import { hasPermission } from '@naratala/shared';
import type { EmployeeRow } from './employeeRepo.js';

export type SalaryScope = 'visible' | 'hidden';

export function toEmployeeDTO(row: EmployeeRow, salaryScope: SalaryScope): EmployeeDTO {
  const visible = salaryScope === 'visible';
  return {
    id: row.id,
    userId: row.userId,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    pronouns: row.pronouns,
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    position: row.position,
    location: row.location,
    employmentType: row.employmentType,
    employmentStatus: row.employmentStatus,
    hireDate: row.hireDate,
    managerId: row.managerId,
    avatarColorHue: row.avatarColorHue,
    salaryAmount: visible ? row.salaryAmount : null,
    salaryCurrency: row.salaryCurrency,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface SalaryScoper {
  forRow(row: EmployeeRow): SalaryScope;
}

export function makeSalaryScoper(input: {
  actorRole: Role;
  actorEmployeeId: number | null;
  directReportIds: Set<number>;
}): SalaryScoper {
  return {
    forRow(row: EmployeeRow): SalaryScope {
      if (hasPermission(input.actorRole, 'employees:read:salary:any')) return 'visible';
      if (input.actorEmployeeId !== null && row.id === input.actorEmployeeId) return 'visible';
      if (
        hasPermission(input.actorRole, 'employees:read:salary:reports') &&
        input.directReportIds.has(row.id)
      )
        return 'visible';
      return 'hidden';
    },
  };
}
