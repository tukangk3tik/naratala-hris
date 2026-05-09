import type { LeaveQuotaRepo } from './leaveQuotaRepo.js';
import type { LeavePolicyRepo } from './leavePolicyRepo.js';
import type { LeaveTypeT } from '@naratala/shared';

interface Deps {
  quotas: LeaveQuotaRepo;
  policies: LeavePolicyRepo;
}

export type LeaveQuotaService = ReturnType<typeof createLeaveQuotaService>;

export function createLeaveQuotaService(deps: Deps) {
  return {
    quotaFor: async (employeeId: number, leaveType: LeaveTypeT): Promise<number> => {
      const override = await deps.quotas.find(employeeId, leaveType);
      if (override) return Number(override.daysPerYear);
      const policies = await deps.policies.list();
      const p = policies.find((x) => x.leaveType === leaveType);
      return p ? Number(p.defaultDaysPerYear) : 0;
    },
    upsertOverride: (employeeId: number, leaveType: LeaveTypeT, daysPerYear: number) =>
      deps.quotas.upsert(employeeId, leaveType, daysPerYear.toFixed(2)),
    removeOverride: (employeeId: number, leaveType: LeaveTypeT) =>
      deps.quotas.remove(employeeId, leaveType),
    listForEmployee: (employeeId: number) => deps.quotas.listForEmployee(employeeId),
  };
}
