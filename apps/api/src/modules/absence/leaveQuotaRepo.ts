import { and, eq } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { leaveQuotas } from '../../shared/db/schema.js';
import type { LeaveTypeT } from '@naratala/shared';

export type LeaveQuotaRow = typeof leaveQuotas.$inferSelect;
export type LeaveQuotaRepo = ReturnType<typeof createLeaveQuotaRepo>;

export function createLeaveQuotaRepo(db: DB) {
  return {
    find: async (employeeId: number, leaveType: LeaveTypeT) => {
      const [r] = await db
        .select()
        .from(leaveQuotas)
        .where(and(eq(leaveQuotas.employeeId, employeeId), eq(leaveQuotas.leaveType, leaveType)));
      return r ?? null;
    },
    listForEmployee: (employeeId: number) =>
      db.select().from(leaveQuotas).where(eq(leaveQuotas.employeeId, employeeId)),
    upsert: async (employeeId: number, leaveType: LeaveTypeT, daysPerYear: string) => {
      const [existing] = await db
        .select()
        .from(leaveQuotas)
        .where(and(eq(leaveQuotas.employeeId, employeeId), eq(leaveQuotas.leaveType, leaveType)));
      if (existing) {
        await db.update(leaveQuotas).set({ daysPerYear }).where(eq(leaveQuotas.id, existing.id));
        const [row] = await db.select().from(leaveQuotas).where(eq(leaveQuotas.id, existing.id));
        return row!;
      }
      const [r] = await db
        .insert(leaveQuotas)
        .values({ employeeId, leaveType, daysPerYear })
        .$returningId();
      const [row] = await db.select().from(leaveQuotas).where(eq(leaveQuotas.id, r!.id));
      return row!;
    },
    remove: (employeeId: number, leaveType: LeaveTypeT) =>
      db
        .delete(leaveQuotas)
        .where(and(eq(leaveQuotas.employeeId, employeeId), eq(leaveQuotas.leaveType, leaveType))),
  };
}
