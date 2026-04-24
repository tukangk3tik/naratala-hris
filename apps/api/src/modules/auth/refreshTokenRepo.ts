import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { refreshTokens } from '../../shared/db/schema.js';

export interface RefreshTokenRow {
  id: number;
  userId: number;
  familyId: string;
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: number | null;
}

export interface RefreshTokenRepo {
  insert(
    row: Omit<RefreshTokenRow, 'id' | 'revokedAt' | 'replacedById'> & {
      userAgent?: string | null;
      ip?: string | null;
    },
  ): Promise<number>;
  findByHash(hash: string): Promise<RefreshTokenRow | undefined>;
  markReplaced(id: number, replacedById: number): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
  revokeAllForUser(userId: number): Promise<void>;
  deleteExpired(before: Date): Promise<number>;
}

export function createRefreshTokenRepo(db: DB): RefreshTokenRepo {
  return {
    async insert(row) {
      const [r] = await db
        .insert(refreshTokens)
        .values({
          userId: row.userId,
          familyId: row.familyId,
          tokenHash: row.tokenHash,
          issuedAt: row.issuedAt,
          expiresAt: row.expiresAt,
          userAgent: row.userAgent ?? null,
          ip: row.ip ?? null,
        })
        .$returningId();
      return r!.id;
    },
    async findByHash(hash) {
      const [row] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, hash))
        .limit(1);
      return row as RefreshTokenRow | undefined;
    },
    async markReplaced(id, replacedById) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date(), replacedById })
        .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)));
    },
    async revokeFamily(familyId) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: sql`COALESCE(revoked_at, CURRENT_TIMESTAMP(3))` })
        .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
    },
    async revokeAllForUser(userId) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: sql`COALESCE(revoked_at, CURRENT_TIMESTAMP(3))` })
        .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
    },
    async deleteExpired(before) {
      const r = (await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, before))) as {
        affectedRows?: number;
      };
      return Number(r?.affectedRows ?? 0);
    },
  };
}
