import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { leaveRequests } from '../../shared/db/schema.js';
import type { LeaveQuotaService } from './leaveQuotaService.js';
import type { LeaveTypeT } from '@naratala/shared';

const ALL_TYPES: LeaveTypeT[] = ['vacation', 'sick', 'personal', 'bereavement', 'parental', 'unpaid'];

interface Deps {
  db: DB;
  quotas: LeaveQuotaService;
}

export interface Balance {
  leaveType: LeaveTypeT;
  quota: number;
  used: number;
  pending: number;
  available: number;
}

export type BalanceService = ReturnType<typeof createBalanceService>;

export function createBalanceService(deps: Deps) {
  async function tally(employeeId: number, year: number): Promise<Map<LeaveTypeT, { used: number; pending: number }>> {
    const rows = await deps.db
      .select({
        leaveType: leaveRequests.leaveType,
        days: leaveRequests.days,
        status: leaveRequests.status,
      })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.employeeId, employeeId),
          gte(leaveRequests.fromDate, `${year}-01-01`),
          lte(leaveRequests.fromDate, `${year}-12-31`),
          inArray(leaveRequests.status, ['approved', 'pending']),
        ),
      );
    const m = new Map<LeaveTypeT, { used: number; pending: number }>();
    for (const r of rows) {
      const cur = m.get(r.leaveType) ?? { used: 0, pending: 0 };
      const d = Number(r.days);
      if (r.status === 'approved') cur.used += d;
      else cur.pending += d;
      m.set(r.leaveType, cur);
    }
    return m;
  }

  return {
    balanceFor: async (employeeId: number, year: number, leaveType: LeaveTypeT): Promise<Balance> => {
      const quota = await deps.quotas.quotaFor(employeeId, leaveType);
      const t = (await tally(employeeId, year)).get(leaveType) ?? { used: 0, pending: 0 };
      return {
        leaveType,
        quota,
        used: t.used,
        pending: t.pending,
        available: Math.max(0, quota - t.used - t.pending),
      };
    },
    summary: async (employeeId: number, year: number): Promise<Balance[]> => {
      const t = await tally(employeeId, year);
      const out: Balance[] = [];
      for (const lt of ALL_TYPES) {
        const quota = await deps.quotas.quotaFor(employeeId, lt);
        const v = t.get(lt) ?? { used: 0, pending: 0 };
        out.push({
          leaveType: lt,
          quota,
          used: v.used,
          pending: v.pending,
          available: Math.max(0, quota - v.used - v.pending),
        });
      }
      return out;
    },
  };
}
