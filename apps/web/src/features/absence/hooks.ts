import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  LeaveRequestDTO,
  BalanceDTO,
  HolidayDTO,
  LeavePolicyDTO,
  LeaveTypeT,
} from '@naratala/shared';
import { apiFetch } from '../../shared/api/client.js';
import { qk } from '../../shared/api/queries.js';

export interface RequestFilters {
  status?: 'pending' | 'approved' | 'declined' | 'cancelled';
  employeeId?: number;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

function qs(filters: Record<string, unknown>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  return p.toString();
}

export function useLeaveRequestsQuery(filters: RequestFilters) {
  const s = qs(filters as Record<string, unknown>);
  return useQuery({
    queryKey: qk.absence.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiFetch<{ data: LeaveRequestDTO[]; page: number; pageSize: number; total: number }>(
        `/api/absence/requests${s ? `?${s}` : ''}`,
      ),
  });
}

export function useBalancesQuery(employeeId: number | null, year: number) {
  return useQuery({
    queryKey: qk.absence.balances(employeeId ?? 'self', year),
    queryFn: () =>
      apiFetch<{ data: BalanceDTO[] }>(
        `/api/absence/requests/balances?${qs({ employeeId: employeeId ?? undefined, year })}`,
      ),
  });
}

export function useSubmitRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { leaveType: LeaveTypeT; fromDate: string; toDate: string; reason?: string; employeeId?: number }) =>
      apiFetch<LeaveRequestDTO>('/api/absence/requests', { method: 'POST', body: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['absence', 'list'] });
      qc.invalidateQueries({ queryKey: ['absence', 'balances'] });
    },
  });
}

export function useDecideRequest(action: 'approve' | 'decline') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; note?: string }) =>
      apiFetch<LeaveRequestDTO>(`/api/absence/requests/${v.id}/${action}`, {
        method: 'POST',
        body: { note: v.note },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['absence', 'list'] });
      qc.invalidateQueries({ queryKey: ['absence', 'balances'] });
      qc.invalidateQueries({ queryKey: ['audit', 'list'] });
    },
  });
}

export function useCancelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<LeaveRequestDTO>(`/api/absence/requests/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['absence', 'list'] });
      qc.invalidateQueries({ queryKey: ['absence', 'balances'] });
    },
  });
}

export function useHolidaysQuery(year: number) {
  return useQuery({
    queryKey: qk.absence.holidays(year),
    queryFn: () => apiFetch<{ data: HolidayDTO[] }>(`/api/holidays?year=${year}`),
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { date: string; label: string; recurringAnnually?: boolean }) =>
      apiFetch<HolidayDTO>('/api/holidays', { method: 'POST', body: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['absence', 'holidays'] }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/holidays/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['absence', 'holidays'] }),
  });
}

export function useLeavePoliciesQuery() {
  return useQuery({
    queryKey: qk.absence.policies(),
    queryFn: () => apiFetch<{ data: LeavePolicyDTO[] }>('/api/leave-policies'),
  });
}

export function useUpdateLeavePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; defaultDaysPerYear?: number; isPaid?: boolean; affectsBalance?: boolean }) =>
      apiFetch<LeavePolicyDTO>(`/api/leave-policies/${v.id}`, {
        method: 'PATCH',
        body: { defaultDaysPerYear: v.defaultDaysPerYear, isPaid: v.isPaid, affectsBalance: v.affectsBalance },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['absence', 'policies'] }),
  });
}

export function useScheduleQuery() {
  return useQuery({
    queryKey: qk.absence.schedule(),
    queryFn: () =>
      apiFetch<{
        defaultWorkingDays: number;
        perEmployeeOverrides: Array<{ employeeId: number; workingDays: number }>;
      }>('/api/working-schedule'),
  });
}

export function useUpdateDefaultSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workingDays: number) =>
      apiFetch('/api/working-schedule/default', { method: 'PATCH', body: { workingDays } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['absence', 'schedule'] }),
  });
}
