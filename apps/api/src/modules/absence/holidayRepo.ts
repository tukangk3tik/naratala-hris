import { and, eq, gte, lte } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { holidays } from '../../shared/db/schema.js';

export type HolidayRow = typeof holidays.$inferSelect;
export type HolidayRepo = ReturnType<typeof createHolidayRepo>;

export function createHolidayRepo(db: DB) {
  return {
    listByYear: (year: number) =>
      db
        .select()
        .from(holidays)
        .where(and(gte(holidays.date, `${year}-01-01`), lte(holidays.date, `${year}-12-31`))),
    listAll: () => db.select().from(holidays),
    insert: async (v: { date: string; label: string; recurringAnnually: boolean }) => {
      const [r] = await db.insert(holidays).values(v).$returningId();
      const [row] = await db.select().from(holidays).where(eq(holidays.id, r!.id));
      return row!;
    },
    update: async (id: number, v: Partial<{ date: string; label: string; recurringAnnually: boolean }>) => {
      await db.update(holidays).set(v).where(eq(holidays.id, id));
      const [row] = await db.select().from(holidays).where(eq(holidays.id, id));
      return row!;
    },
    remove: (id: number) => db.delete(holidays).where(eq(holidays.id, id)),
  };
}
