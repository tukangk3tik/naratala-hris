import { and, eq, gt, isNull } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { invites, employees } from '../../shared/db/schema.js';
import type { Role } from '@naratala/shared';

export interface InviteRow {
  id: number;
  employeeId: number;
  email: string;
  roleToAssign: Role;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdBy: number;
  createdAt: Date;
}

export interface InviteRepo {
  create(input: Omit<InviteRow, 'id' | 'acceptedAt' | 'createdAt'>): Promise<number>;
  findById(id: number): Promise<InviteRow | undefined>;
  findUsableByHash(
    hash: string,
    now: Date,
  ): Promise<(InviteRow & { employeeFullName: string }) | undefined>;
  rotate(id: number, newHash: string, newExpiresAt: Date): Promise<void>;
  markAccepted(id: number): Promise<void>;
  deleteById(id: number): Promise<number>;
}

export function createInviteRepo(db: DB): InviteRepo {
  return {
    async create(input) {
      const [r] = await db
        .insert(invites)
        .values({
          employeeId: input.employeeId,
          email: input.email,
          roleToAssign: input.roleToAssign,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          createdBy: input.createdBy,
        })
        .$returningId();
      return r!.id;
    },
    async findById(id) {
      const [row] = await db.select().from(invites).where(eq(invites.id, id)).limit(1);
      return row as InviteRow | undefined;
    },
    async findUsableByHash(hash, now) {
      const [row] = await db
        .select({
          id: invites.id,
          employeeId: invites.employeeId,
          email: invites.email,
          roleToAssign: invites.roleToAssign,
          tokenHash: invites.tokenHash,
          expiresAt: invites.expiresAt,
          acceptedAt: invites.acceptedAt,
          createdBy: invites.createdBy,
          createdAt: invites.createdAt,
          employeeFullName: employees.fullName,
        })
        .from(invites)
        .innerJoin(employees, eq(employees.id, invites.employeeId))
        .where(
          and(
            eq(invites.tokenHash, hash),
            isNull(invites.acceptedAt),
            gt(invites.expiresAt, now),
          ),
        )
        .limit(1);
      return row as (InviteRow & { employeeFullName: string }) | undefined;
    },
    async rotate(id, newHash, newExpiresAt) {
      await db
        .update(invites)
        .set({ tokenHash: newHash, expiresAt: newExpiresAt })
        .where(eq(invites.id, id));
    },
    async markAccepted(id) {
      await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, id));
    },
    async deleteById(id) {
      const r = (await db.delete(invites).where(eq(invites.id, id))) as unknown as {
        affectedRows?: number;
      };
      return Number(r?.affectedRows ?? 0);
    },
  };
}
