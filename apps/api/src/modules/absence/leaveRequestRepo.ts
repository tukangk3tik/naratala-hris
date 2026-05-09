import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { employees, leaveRequests } from '../../shared/db/schema.js';
import type { LeaveStatusT, LeaveTypeT } from '@naratala/shared';

export type LeaveRequestRow = typeof leaveRequests.$inferSelect;
export type LeaveRequestRepo = ReturnType<typeof createLeaveRequestRepo>;

interface ListFilters {
  employeeIds?: number[] | 'any';
  status?: LeaveStatusT;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export function createLeaveRequestRepo(db: DB) {
  return {
    insert: async (v: {
      employeeId: number;
      actorUserId: number;
      leaveType: LeaveTypeT;
      fromDate: string;
      toDate: string;
      days: string;
      reason?: string;
      status: LeaveStatusT;
      decidedByUserId?: number;
      decidedAt?: Date;
    }) => {
      const [r] = await db.insert(leaveRequests).values(v).$returningId();
      const [row] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, r!.id));
      return row!;
    },
    findById: async (id: number) => {
      const [r] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
      return r ?? null;
    },
    list: async (f: ListFilters) => {
      const where = [] as unknown[];
      if (f.employeeIds && f.employeeIds !== 'any') {
        if (f.employeeIds.length === 0) return { data: [], total: 0 };
        where.push(inArray(leaveRequests.employeeId, f.employeeIds));
      }
      if (f.status) where.push(eq(leaveRequests.status, f.status));
      if (f.from) where.push(gte(leaveRequests.fromDate, f.from));
      if (f.to) where.push(lte(leaveRequests.fromDate, f.to));
      const conds = where.length ? (and(...(where as any[])) as any) : undefined;
      const baseQ = conds ? db.select().from(leaveRequests).where(conds) : db.select().from(leaveRequests);
      const data = await baseQ
        .orderBy(desc(leaveRequests.fromDate), asc(leaveRequests.id))
        .limit(f.pageSize)
        .offset((f.page - 1) * f.pageSize);
      const countRows = (await (conds
        ? db.select({ c: sql<number>`count(*)` }).from(leaveRequests).where(conds)
        : db.select({ c: sql<number>`count(*)` }).from(leaveRequests))) as { c: number }[];
      return { data, total: Number(countRows[0]!.c) };
    },
    update: async (id: number, patch: Partial<LeaveRequestRow>) => {
      await db.update(leaveRequests).set(patch).where(eq(leaveRequests.id, id));
      const [row] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
      return row!;
    },
    findManagedReportIds: async (managerEmployeeId: number) => {
      const rows = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.managerId, managerEmployeeId));
      return rows.map((r) => r.id);
    },
  };
}
