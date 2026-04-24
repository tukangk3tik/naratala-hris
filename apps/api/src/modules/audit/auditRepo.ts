import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { auditLog } from '../../shared/db/schema.js';

export interface AuditEntry {
  id: number;
  actorUserId: number | null;
  actorIp: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  changes: unknown;
  createdAt: Date;
}

export interface AuditRepo {
  write(entry: Omit<AuditEntry, 'id' | 'createdAt'>): Promise<void>;
  list(f: {
    action?: string;
    entityType?: string;
    entityId?: number;
    page: number;
    pageSize: number;
  }): Promise<{ rows: AuditEntry[]; total: number }>;
}

export function createAuditRepo(db: DB): AuditRepo {
  return {
    async write(entry) {
      await db.insert(auditLog).values({
        actorUserId: entry.actorUserId,
        actorIp: entry.actorIp,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        changes: entry.changes,
      });
    },
    async list(f) {
      const conds: SQL[] = [];
      if (f.action) conds.push(eq(auditLog.action, f.action));
      if (f.entityType) conds.push(eq(auditLog.entityType, f.entityType));
      if (f.entityId !== undefined) conds.push(eq(auditLog.entityId, f.entityId));
      const where = conds.length > 0 ? and(...conds) : undefined;

      const offset = (f.page - 1) * f.pageSize;
      const q = db.select().from(auditLog);
      const rows = await (where ? q.where(where) : q)
        .orderBy(desc(auditLog.createdAt))
        .limit(f.pageSize)
        .offset(offset);

      const result = await db.execute<{ n: number }>(sql`SELECT COUNT(*) AS n FROM audit_log`);
      const cRows = Array.isArray(result) ? result[0] : result;
      const cFirst = Array.isArray(cRows) ? cRows[0] : cRows;
      return {
        rows: rows as AuditEntry[],
        total: Number((cFirst as { n?: number } | undefined)?.n ?? 0),
      };
    },
  };
}
