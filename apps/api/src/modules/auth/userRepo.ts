import { and, eq, isNull, sql } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { users } from '../../shared/db/schema.js';
import type { Role } from '@naratala/shared';

export type UserStatus = 'pending' | 'active' | 'disabled';

export interface UserRow {
  id: number;
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  mfaSecret: Buffer | null;
  language: 'id' | 'en';
  lastLoginAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRepo {
  findByEmail(email: string): Promise<UserRow | undefined>;
  findById(id: number): Promise<UserRow | undefined>;
  listByRole(role: Role): Promise<UserRow[]>;
  setLastLogin(id: number, at: Date): Promise<void>;
  updatePasswordHash(id: number, hash: string, mustChange: boolean): Promise<void>;
  updateMfa(id: number, enabled: boolean, secret: Buffer | null): Promise<void>;
  patch(id: number, patch: Partial<Pick<UserRow, 'role' | 'status' | 'language'>>): Promise<void>;
  countAdmins(): Promise<number>;
  listPaginated(params: {
    page: number;
    pageSize: number;
  }): Promise<{ rows: UserRow[]; total: number }>;
}

export function createUserRepo(db: DB): UserRepo {
  return {
    async findByEmail(email) {
      const [row] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
        .limit(1);
      return row as UserRow | undefined;
    },
    async findById(id) {
      const [row] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, id), isNull(users.deletedAt)))
        .limit(1);
      return row as UserRow | undefined;
    },
    async listByRole(role) {
      const rows = await db.select().from(users).where(eq(users.role, role));
      return rows as UserRow[];
    },
    async setLastLogin(id, at) {
      await db.update(users).set({ lastLoginAt: at }).where(eq(users.id, id));
    },
    async updatePasswordHash(id, hash, mustChange) {
      await db
        .update(users)
        .set({ passwordHash: hash, mustChangePassword: mustChange })
        .where(eq(users.id, id));
    },
    async updateMfa(id, enabled, secret) {
      await db
        .update(users)
        .set({ mfaEnabled: enabled, mfaSecret: secret as unknown as string | null })
        .where(eq(users.id, id));
    },
    async patch(id, p) {
      if (Object.keys(p).length === 0) return;
      await db.update(users).set(p).where(eq(users.id, id));
    },
    async countAdmins() {
      const result = await db.execute<{ n: number }>(
        sql`SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active' AND deleted_at IS NULL`,
      );
      const rows = Array.isArray(result) ? result[0] : result;
      const first = Array.isArray(rows) ? rows[0] : rows;
      return Number((first as { n?: number } | undefined)?.n ?? 0);
    },
    async listPaginated({ page, pageSize }) {
      const offset = (page - 1) * pageSize;
      const rows = await db
        .select()
        .from(users)
        .where(isNull(users.deletedAt))
        .orderBy(users.email)
        .limit(pageSize)
        .offset(offset);
      const cRes = await db.execute<{ n: number }>(
        sql`SELECT COUNT(*) AS n FROM users WHERE deleted_at IS NULL`,
      );
      const cRows = Array.isArray(cRes) ? cRes[0] : cRes;
      const cFirst = Array.isArray(cRows) ? cRows[0] : cRows;
      return {
        rows: rows as UserRow[],
        total: Number((cFirst as { n?: number } | undefined)?.n ?? 0),
      };
    },
  };
}
