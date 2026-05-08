import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmployeeDTO, EmployeeUpdate } from '@naratala/shared';
import type { z } from 'zod';
import { apiFetch } from '../../shared/api/client.js';
import { qk } from '../../shared/api/queries.js';

export interface EmployeeFilters {
  q?: string;
  department?: number;
  status?: 'active' | 'on_leave' | 'terminated';
  page?: number;
  pageSize?: number;
  sort?: 'name' | 'hireDate' | 'department';
  sortDir?: 'asc' | 'desc';
}

export function useEmployeesQuery(filters: EmployeeFilters) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return useQuery({
    queryKey: qk.employees.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiFetch<{ data: EmployeeDTO[]; page: number; pageSize: number; total: number }>(
        `/api/employees${qs ? `?${qs}` : ''}`,
      ),
  });
}

export function useEmployeeQuery(id: number | null) {
  return useQuery({
    queryKey: qk.employees.detail(id ?? -1),
    queryFn: () => apiFetch<EmployeeDTO>(`/api/employees/${id}`),
    enabled: id != null,
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; patch: z.infer<typeof EmployeeUpdate> }) =>
      apiFetch<EmployeeDTO>(`/api/employees/${v.id}`, { method: 'PATCH', body: v.patch }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['employees', 'list'] });
      qc.invalidateQueries({ queryKey: qk.employees.detail(v.id) });
      qc.invalidateQueries({ queryKey: ['audit', 'list'] });
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/employees/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees', 'list'] }),
  });
}
