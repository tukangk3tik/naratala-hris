import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DepartmentDTO } from '@naratala/shared';
import { apiFetch } from '../../shared/api/client.js';
import { qk } from '../../shared/api/queries.js';

export function useDepartmentsQuery() {
  return useQuery({
    queryKey: qk.departments.all(),
    queryFn: () => apiFetch<{ data: DepartmentDTO[] }>('/api/departments'),
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<DepartmentDTO>('/api/departments', { method: 'POST', body: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.departments.all() }),
  });
}

export function useRenameDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; name: string }) =>
      apiFetch(`/api/departments/${v.id}`, { method: 'PATCH', body: { name: v.name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.departments.all() }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/departments/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.departments.all() }),
  });
}
