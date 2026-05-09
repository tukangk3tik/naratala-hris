import { eq, isNotNull } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { companySettings, employees } from '../../shared/db/schema.js';

export type WorkingScheduleRepo = ReturnType<typeof createWorkingScheduleRepo>;

export function createWorkingScheduleRepo(db: DB) {
  return {
    findEmployee: async (id: number) => {
      const [r] = await db
        .select({ id: employees.id, workingDays: employees.workingDays })
        .from(employees)
        .where(eq(employees.id, id));
      return r ?? null;
    },
    setEmployeeOverride: (id: number, workingDays: number | null) =>
      db.update(employees).set({ workingDays }).where(eq(employees.id, id)),
    getDefault: async () => {
      const [row] = await db.select().from(companySettings).where(eq(companySettings.id, 1));
      return row!.defaultWorkingDays;
    },
    setDefault: (workingDays: number) =>
      db.update(companySettings).set({ defaultWorkingDays: workingDays }).where(eq(companySettings.id, 1)),
    listOverrides: () =>
      db
        .select({ employeeId: employees.id, workingDays: employees.workingDays })
        .from(employees)
        .where(isNotNull(employees.workingDays)),
  };
}
