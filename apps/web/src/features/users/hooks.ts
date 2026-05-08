import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserDTO } from '@naratala/shared';
import { apiFetch } from '../../shared/api/client.js';
import { qk } from '../../shared/api/queries.js';

export function useUsersQuery(filters: { page?: number; pageSize?: number }) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined) params.set(k, String(v));
  }
  const qs = params.toString();
  return useQuery({
    queryKey: qk.users.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiFetch<{ data: UserDTO[]; page: number; pageSize: number; total: number }>(
        `/api/users${qs ? `?${qs}` : ''}`,
      ),
  });
}

export function usePatchUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; patch: Partial<UserDTO> }) =>
      apiFetch<UserDTO>(`/api/users/${v.id}`, { method: 'PATCH', body: v.patch }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users', 'list'] });
      qc.invalidateQueries({ queryKey: ['audit', 'list'] });
    },
  });
}

export function useForceLogoutUser() {
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/users/${id}/force-logout`, { method: 'POST' }),
  });
}
