import { and, eq, gt, isNull } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { passwordResets } from '../../shared/db/schema.js';

export interface PasswordResetRepo {
  insert(userId: number, tokenHash: string, expiresAt: Date): Promise<void>;
  findUsableByHash(
    tokenHash: string,
    now: Date,
  ): Promise<{ id: number; userId: number } | undefined>;
  consume(id: number): Promise<void>;
}

export function createPasswordResetRepo(db: DB): PasswordResetRepo {
  return {
    async insert(userId, tokenHash, expiresAt) {
      await db.insert(passwordResets).values({ userId, tokenHash, expiresAt });
    },
    async findUsableByHash(tokenHash, now) {
      const [row] = await db
        .select()
        .from(passwordResets)
        .where(
          and(
            eq(passwordResets.tokenHash, tokenHash),
            isNull(passwordResets.consumedAt),
            gt(passwordResets.expiresAt, now),
          ),
        )
        .limit(1);
      return row ? { id: row.id, userId: row.userId } : undefined;
    },
    async consume(id) {
      await db
        .update(passwordResets)
        .set({ consumedAt: new Date() })
        .where(eq(passwordResets.id, id));
    },
  };
}
