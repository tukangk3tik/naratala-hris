import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { usePayRunDetailQuery, useFinalizeRun, useCancelRun, useAdjustPayslip } from './hooks.js';
import { Pill } from '../../shared/ui/Pill.js';
import { toast } from 'sonner';

function fmt(v: string | null | undefined) {
  if (!v) return '—';
  return `Rp ${Number(v).toLocaleString('id-ID')}`;
}

function statusTone(s: string): 'good' | 'warn' | 'neutral' | 'bad' {
  if (s === 'finalized') return 'good';
  if (s === 'draft') return 'warn';
  if (s === 'cancelled') return 'bad';
  return 'neutral';
}

export function PayRunDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const runId = Number(id ?? 0);
  const navigate = useNavigate();
  const { data: run, isLoading } = usePayRunDetailQuery(runId);
  const finalizeMut = useFinalizeRun();
  const cancelMut = useCancelRun();
  const adjustMut = useAdjustPayslip();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');

  if (isLoading) return <div className="nt-fullpage-spinner" />;
  if (!run) return <p>Run not found</p>;

  const isDraft = run.status === 'draft';

  function handleFinalize() {
    finalizeMut.mutate(runId, {
      onSuccess: () => toast.success('Run finalized'),
      onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
    });
  }

  function handleCancel() {
    cancelMut.mutate(runId, {
      onSuccess: () => { toast.success('Run cancelled'); navigate('/payroll'); },
      onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
    });
  }

  function startEdit(payslipId: number, current: string) {
    setEditingId(payslipId);
    setEditVal(current);
  }

  function saveEdit(payslipId: number) {
    adjustMut.mutate(
      { runId, payslipId, deductionAmount: editVal },
      {
        onSuccess: () => { setEditingId(null); toast.success('Deduction updated'); },
        onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
      },
    );
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0, flex: 1 }}>{run.name}</h2>
        <Pill tone={statusTone(run.status)}>{run.status}</Pill>
        {isDraft && (
          <>
            <button className="nt-btn-primary" onClick={handleFinalize} disabled={finalizeMut.isPending}>
              {finalizeMut.isPending ? 'Finalizing…' : 'Finalize'}
            </button>
            <button className="nt-icon-btn-line" onClick={handleCancel} disabled={cancelMut.isPending}>
              Cancel run
            </button>
          </>
        )}
      </div>
      <p className="muted">{run.periodStart} – {run.periodEnd} · {run.currency}</p>

      <table className="nt-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Department</th>
            <th>Gross</th>
            <th>Deduction</th>
            <th>Net</th>
          </tr>
        </thead>
        <tbody>
          {run.payslips.map((ps) => (
            <tr key={ps.id}>
              <td>{ps.employeeName}</td>
              <td>{ps.department}</td>
              <td>{fmt(ps.grossAmount)}</td>
              <td>
                {isDraft && editingId === ps.id ? (
                  <span style={{ display: 'flex', gap: 4 }}>
                    <input
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      className="nt-input"
                      style={{ width: 120 }}
                      aria-label="Deduction amount"
                    />
                    <button className="nt-btn-primary" onClick={() => saveEdit(ps.id)}>Save</button>
                    <button className="nt-icon-btn-line" onClick={() => setEditingId(null)}>×</button>
                  </span>
                ) : (
                  <span
                    style={{ cursor: isDraft ? 'pointer' : 'default', textDecoration: isDraft ? 'underline dotted' : 'none' }}
                    onClick={() => isDraft && startEdit(ps.id, ps.deductionAmount)}
                    title={isDraft ? 'Click to edit' : undefined}
                  >
                    {fmt(ps.deductionAmount)}
                  </span>
                )}
              </td>
              <td>{fmt(ps.netAmount)}</td>
            </tr>
          ))}
        </tbody>
        {run.status === 'finalized' && (
          <tfoot>
            <tr>
              <td colSpan={2}><strong>Total</strong></td>
              <td><strong>{fmt(run.totalGross)}</strong></td>
              <td />
              <td><strong>{fmt(run.totalNet)}</strong></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
