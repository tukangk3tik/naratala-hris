import { eq } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { leavePolicies } from '../../shared/db/schema.js';

export type LeavePolicyRow = typeof leavePolicies.$inferSelect;
export type LeavePolicyRepo = ReturnType<typeof createLeavePolicyRepo>;

export function createLeavePolicyRepo(db: DB) {
  return {
    list: () => db.select().from(leavePolicies),
    findById: async (id: number) => {
      const [r] = await db.select().from(leavePolicies).where(eq(leavePolicies.id, id));
      return r ?? null;
    },
    update: async (
      id: number,
      v: Partial<{ defaultDaysPerYear: string; isPaid: boolean; affectsBalance: boolean }>,
    ) => {
      await db.update(leavePolicies).set(v).where(eq(leavePolicies.id, id));
      const [row] = await db.select().from(leavePolicies).where(eq(leavePolicies.id, id));
      return row!;
    },
  };
}
