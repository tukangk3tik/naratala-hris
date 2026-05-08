import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../shared/api/client.js';
import { qk } from '../../shared/api/queries.js';

export interface AuditEntry {
  id: number;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: number | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface AuditFilters {
  action?: string;
  entityType?: string;
  entityId?: number;
  page?: number;
  pageSize?: number;
}

export function useAuditQuery(filters: AuditFilters) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return useQuery({
    queryKey: qk.audit.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiFetch<{ data: AuditEntry[]; page: number; pageSize: number; total: number }>(
        `/api/audit${qs ? `?${qs}` : ''}`,
      ),
  });
}
