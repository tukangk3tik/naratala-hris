import { eq } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { payslips, employees, departments } from '../../shared/db/schema.js';

export type PayslipRow = typeof payslips.$inferSelect;
export type PayslipRepo = ReturnType<typeof createPayslipRepo>;

export function createPayslipRepo(db: DB) {
  return {
    insertMany: async (rows: {
      payRunId: number;
      employeeId: number;
      grossAmount: string;
      deductionAmount: string;
      netAmount: string;
      salarySnapshot: { amount: string; currency: string };
    }[]) => {
      if (rows.length === 0) return [];
      await db.insert(payslips).values(rows);
      return db.select().from(payslips).where(eq(payslips.payRunId, rows[0]!.payRunId));
    },

    findByRunId: async (payRunId: number) => {
      return db
        .select({
          id: payslips.id,
          payRunId: payslips.payRunId,
          employeeId: payslips.employeeId,
          employeeName: employees.fullName,
          department: departments.name,
          grossAmount: payslips.grossAmount,
          deductionAmount: payslips.deductionAmount,
          netAmount: payslips.netAmount,
          notes: payslips.notes,
          salarySnapshot: payslips.salarySnapshot,
        })
        .from(payslips)
        .innerJoin(employees, eq(payslips.employeeId, employees.id))
        .innerJoin(departments, eq(employees.departmentId, departments.id))
        .where(eq(payslips.payRunId, payRunId));
    },

    findByEmployeeId: async (employeeId: number, page: number, pageSize: number) => {
      return db
        .select()
        .from(payslips)
        .where(eq(payslips.employeeId, employeeId))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
    },

    findById: async (id: number) => {
      const [row] = await db.select().from(payslips).where(eq(payslips.id, id));
      return row ?? null;
    },

    update: async (id: number, patch: { deductionAmount?: string; notes?: string; netAmount?: string }) => {
      await db.update(payslips).set(patch).where(eq(payslips.id, id));
      const [row] = await db.select().from(payslips).where(eq(payslips.id, id));
      return row!;
    },

    deleteByRunId: (payRunId: number) => db.delete(payslips).where(eq(payslips.payRunId, payRunId)),

    sumByDeptForRun: async (payRunId: number) => {
      return db
        .select({
          deptId: departments.id,
          deptName: departments.name,
          total: payslips.netAmount,
        })
        .from(payslips)
        .innerJoin(employees, eq(payslips.employeeId, employees.id))
        .innerJoin(departments, eq(employees.departmentId, departments.id))
        .where(eq(payslips.payRunId, payRunId));
    },
  };
}
