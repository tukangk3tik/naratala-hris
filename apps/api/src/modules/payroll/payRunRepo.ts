import { desc, eq, sql } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { payRuns } from '../../shared/db/schema.js';
import type { PayRunStatusT } from '@naratala/shared';

export type PayRunRow = typeof payRuns.$inferSelect;
export type PayRunRepo = ReturnType<typeof createPayRunRepo>;

export function createPayRunRepo(db: DB) {
  return {
    insert: async (v: {
      name: string;
      periodStart: string;
      periodEnd: string;
      currency: string;
      notes?: string;
      createdByUserId: number;
    }) => {
      const [r] = await db.insert(payRuns).values({
        name: v.name,
        periodStart: v.periodStart,
        periodEnd: v.periodEnd,
        currency: v.currency,
        ...(v.notes !== undefined ? { notes: v.notes } : {}),
        createdByUserId: v.createdByUserId,
      }).$returningId();
      const [row] = await db.select().from(payRuns).where(eq(payRuns.id, r!.id));
      return row!;
    },

    findById: async (id: number) => {
      const [row] = await db.select().from(payRuns).where(eq(payRuns.id, id));
      return row ?? null;
    },

    list: async (filters: { status?: PayRunStatusT; page: number; pageSize: number }) => {
      const where = filters.status ? eq(payRuns.status, filters.status) : undefined;
      const base = where ? db.select().from(payRuns).where(where) : db.select().from(payRuns);
      const data = await base
        .orderBy(desc(payRuns.periodStart))
        .limit(filters.pageSize)
        .offset((filters.page - 1) * filters.pageSize);
      const countRows = (await (where
        ? db.select({ c: sql<number>`count(*)` }).from(payRuns).where(where)
        : db.select({ c: sql<number>`count(*)` }).from(payRuns))) as { c: number }[];
      return { data, total: Number(countRows[0]!.c) };
    },

    update: async (id: number, patch: Partial<PayRunRow>) => {
      await db.update(payRuns).set(patch).where(eq(payRuns.id, id));
      const [row] = await db.select().from(payRuns).where(eq(payRuns.id, id));
      return row!;
    },

    listFinalized: async (limit: number) => {
      return db
        .select()
        .from(payRuns)
        .where(eq(payRuns.status, 'finalized'))
        .orderBy(desc(payRuns.periodStart))
        .limit(limit);
    },
  };
}
