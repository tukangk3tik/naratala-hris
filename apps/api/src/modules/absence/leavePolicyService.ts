import type { LeavePolicyRepo } from './leavePolicyRepo.js';
import { NotFoundError } from '../../shared/errors/index.js';

export type LeavePolicyService = ReturnType<typeof createLeavePolicyService>;

export function createLeavePolicyService(repo: LeavePolicyRepo) {
  return {
    list: () => repo.list(),
    update: async (
      id: number,
      v: { defaultDaysPerYear?: number; isPaid?: boolean; affectsBalance?: boolean },
    ) => {
      const existing = await repo.findById(id);
      if (!existing) throw new NotFoundError('policy not found');
      const patch: Partial<{ defaultDaysPerYear: string; isPaid: boolean; affectsBalance: boolean }> = {};
      if (v.defaultDaysPerYear !== undefined) patch.defaultDaysPerYear = v.defaultDaysPerYear.toFixed(2);
      if (v.isPaid !== undefined) patch.isPaid = v.isPaid;
      if (v.affectsBalance !== undefined) patch.affectsBalance = v.affectsBalance;
      return repo.update(id, patch);
    },
  };
}
