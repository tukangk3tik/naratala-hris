import { hasPermission, type Role } from '@naratala/shared';
import type { AuditRepo, AuditEntry } from './auditRepo.js';

interface ListInput {
  role: Role;
  action?: string;
  entityType?: string;
  entityId?: number;
  page: number;
  pageSize: number;
}

export function createAuditService(repo: AuditRepo) {
  async function list(f: ListInput) {
    const { rows, total } = await repo.list(f);
    const canSeeSalary = hasPermission(f.role, 'employees:read:salary:any');
    return {
      data: rows.map((r) => redact(r, canSeeSalary)),
      page: f.page,
      pageSize: f.pageSize,
      total,
    };
  }
  return { list };
}
export type AuditService = ReturnType<typeof createAuditService>;

function redact(row: AuditEntry, canSeeSalary: boolean) {
  if (canSeeSalary) return serialize(row);
  const changes =
    row.changes && typeof row.changes === 'object'
      ? deepRedact(row.changes as Record<string, unknown>)
      : row.changes;
  return { ...serialize(row), changes };
}

function serialize(r: AuditEntry) {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

function deepRedact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'salaryAmount') out[k] = '[redacted]';
    else if (v && typeof v === 'object' && !Array.isArray(v))
      out[k] = deepRedact(v as Record<string, unknown>);
    else out[k] = v;
  }
  return out;
}
