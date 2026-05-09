import type { WorkingScheduleRepo } from './workingScheduleRepo.js';
import { NotFoundError } from '../../shared/errors/index.js';

export type WorkingScheduleService = ReturnType<typeof createWorkingScheduleService>;

export function createWorkingScheduleService(repo: WorkingScheduleRepo) {
  return {
    workingDaysFor: async (employeeId: number) => {
      const emp = await repo.findEmployee(employeeId);
      if (!emp) throw new NotFoundError('employee not found');
      if (emp.workingDays !== null) return emp.workingDays;
      return repo.getDefault();
    },
    setEmployeeOverride: (employeeId: number, value: number | null) =>
      repo.setEmployeeOverride(employeeId, value),
    updateDefault: (value: number) => repo.setDefault(value),
    snapshot: async () => ({
      defaultWorkingDays: await repo.getDefault(),
      perEmployeeOverrides: await repo.listOverrides(),
    }),
  };
}
