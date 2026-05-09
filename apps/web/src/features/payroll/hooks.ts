import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PayRunDetailDTO, PayRunDTO, PayslipDTO, PayrollSummaryDTO } from '@naratala/shared';
import { apiFetch } from '../../shared/api/client.js';
import { qk } from '../../shared/api/queries.js';

export interface RunFilters {
  status?: 'draft' | 'finalized' | 'cancelled';
  page?: number;
  pageSize?: number;
}

function qs(o: Record<string, unknown>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  return p.toString();
}

export function usePayrollRunsQuery(filters: RunFilters) {
  const s = qs(filters as Record<string, unknown>);
  return useQuery({
    queryKey: qk.payroll.runs(filters as Record<string, unknown>),
    queryFn: () =>
      apiFetch<{ data: PayRunDTO[]; total: number }>(`/api/payroll/runs${s ? `?${s}` : ''}`),
  });
}

export function usePayRunDetailQuery(id: number) {
  return useQuery({
    queryKey: qk.payroll.runDetail(id),
    queryFn: () => apiFetch<PayRunDetailDTO>(`/api/payroll/runs/${id}`),
    enabled: id > 0,
  });
}

export function usePayrollSummaryQuery() {
  return useQuery({
    queryKey: qk.payroll.summary(),
    queryFn: () => apiFetch<PayrollSummaryDTO>('/api/payroll/summary'),
  });
}

export function useMyPayslipsQuery(page: number) {
  return useQuery({
    queryKey: qk.payroll.mine(page),
    queryFn: () =>
      apiFetch<{ data: PayslipDTO[]; page: number; pageSize: number }>(`/api/payroll/me?page=${page}`),
  });
}

export function useCreatePayRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { name: string; periodStart: string; periodEnd: string; currency?: string; notes?: string }) =>
      apiFetch<PayRunDetailDTO>('/api/payroll/runs', { method: 'POST', body: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll', 'runs'] }); },
  });
}

export function useFinalizeRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<PayRunDTO>(`/api/payroll/runs/${id}/finalize`, { method: 'POST', body: {} }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['payroll', 'runs'] });
      qc.invalidateQueries({ queryKey: qk.payroll.runDetail(id) });
      qc.invalidateQueries({ queryKey: qk.payroll.summary() });
    },
  });
}

export function useCancelRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/payroll/runs/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll', 'runs'] }); },
  });
}

export function useAdjustPayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { runId: number; payslipId: number; deductionAmount?: string; notes?: string }) =>
      apiFetch<PayslipDTO>(
        `/api/payroll/runs/${v.runId}/payslips/${v.payslipId}`,
        {
          method: 'PATCH',
          body: {
            ...(v.deductionAmount !== undefined ? { deductionAmount: v.deductionAmount } : {}),
            ...(v.notes !== undefined ? { notes: v.notes } : {}),
          },
        },
      ),
    onSuccess: (_data, v) => {
      qc.invalidateQueries({ queryKey: qk.payroll.runDetail(v.runId) });
    },
  });
}
