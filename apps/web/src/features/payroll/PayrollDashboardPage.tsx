import { usePayrollSummaryQuery, usePayrollRunsQuery, useCreatePayRun } from './hooks.js';
import { Banknote } from 'lucide-react';
import { Pill } from '../../shared/ui/Pill.js';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PayRunCreate } from '@naratala/shared';
import type { z } from 'zod';

const DEPT_COLORS = ['sage', 'terracotta', 'butter', 'plum', 'sky', 'neutral'];

function fmt(amount: string | null | undefined): string {
  if (!amount) return '—';
  return `Rp ${Number(amount).toLocaleString('id-ID')}`;
}

function statusTone(s: string): 'good' | 'warn' | 'neutral' | 'bad' {
  if (s === 'finalized') return 'good';
  if (s === 'draft') return 'warn';
  if (s === 'cancelled') return 'bad';
  return 'neutral';
}

export function PayrollDashboardPage(): JSX.Element {
  const { data: summary } = usePayrollSummaryQuery();
  const { data: runs } = usePayrollRunsQuery({ pageSize: 10, page: 1 });
  const createMut = useCreatePayRun();

  const form = useForm<z.infer<typeof PayRunCreate>>({
    resolver: zodResolver(PayRunCreate),
    defaultValues: { name: '', periodStart: '', periodEnd: '', currency: 'IDR' },
  });

  const draftRuns = runs?.data.filter((r) => r.status === 'draft') ?? [];
  const latestFinalized = runs?.data.find((r) => r.status === 'finalized');

  const months = summary?.months ?? [];
  const dept = summary?.deptBreakdown ?? [];

  const maxTotal = Math.max(...months.map((m) => Number(m.total)), 1);
  const maxHc = Math.max(...months.map((m) => m.headcount), 1);

  function onSubmit(v: z.infer<typeof PayRunCreate>) {
    createMut.mutate({
      name: v.name,
      periodStart: v.periodStart,
      periodEnd: v.periodEnd,
      ...(v.currency !== undefined ? { currency: v.currency } : {}),
      ...(v.notes !== undefined ? { notes: v.notes } : {}),
    }, {
      onSuccess: () => { toast.success('Pay run created'); form.reset(); },
      onError: (e: unknown) => { toast.error(e instanceof Error ? e.message : 'Error'); },
    });
  }

  return (
    <div className="nt-payroll-grid">
      {/* Hero */}
      <div className="nt-payroll-hero">
        <div className="nt-hero-row">
          <div>
            <div className="nt-kicker">Latest finalized run</div>
            <div className="nt-huge-num">{fmt(latestFinalized?.totalNet)}</div>
            <div className="nt-hero-sub">
              {latestFinalized ? (
                <Pill tone="good">{latestFinalized.name}</Pill>
              ) : (
                <span className="muted">No finalized runs yet</span>
              )}
            </div>
          </div>
          <Banknote size={32} strokeWidth={1.5} style={{ color: 'var(--sage)' }} />
        </div>

        {/* Combo chart */}
        {months.length > 0 && (
          <div className="nt-hero-chart">
            <div className="nt-chart-head">
              <div className="nt-chart-title">Monthly payroll (net)</div>
              <div className="nt-chart-legend">
                <span><i className="dot tone-sage" /> Net pay</span>
                <span><i className="dot tone-terracotta" /> Headcount</span>
              </div>
            </div>
            <div className="nt-combo-chart">
              <svg viewBox="0 0 600 220" preserveAspectRatio="none" className="nt-chart-svg">
                <defs>
                  <linearGradient id="gradSage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--sage)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--sage)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3, 4].map((i) => (
                  <line key={i} x1="0" x2="600" y1={20 + i * 40} y2={20 + i * 40} stroke="var(--line)" strokeWidth="1" />
                ))}
                {months.length > 1 && (
                  <>
                    <path
                      d={`M 0 ${220 - (Number(months[0]!.total) / maxTotal) * 180} ${months.map((m, i) => `L ${(i / (months.length - 1)) * 600} ${220 - (Number(m.total) / maxTotal) * 180}`).join(' ')} L 600 220 L 0 220 Z`}
                      fill="url(#gradSage)"
                    />
                    <path
                      d={`M 0 ${220 - (Number(months[0]!.total) / maxTotal) * 180} ${months.map((m, i) => `L ${(i / (months.length - 1)) * 600} ${220 - (Number(m.total) / maxTotal) * 180}`).join(' ')}`}
                      stroke="var(--sage)" strokeWidth="2.5" fill="none" strokeLinecap="round"
                    />
                    <path
                      d={`M 0 ${220 - (months[0]!.headcount / maxHc) * 160} ${months.map((m, i) => `L ${(i / (months.length - 1)) * 600} ${220 - (m.headcount / maxHc) * 160}`).join(' ')}`}
                      stroke="var(--terracotta)" strokeWidth="2" fill="none" strokeDasharray="4 4" strokeLinecap="round"
                    />
                  </>
                )}
              </svg>
              <div className="nt-chart-x">
                {months.map((m) => <span key={m.month}>{m.month.slice(0, 7)}</span>)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dept spend donut */}
      <div className="nt-card">
        <div className="nt-card-header"><span className="nt-card-title">Dept spend</span></div>
        {dept.length === 0 ? (
          <p className="muted" style={{ padding: '16px' }}>No data yet</p>
        ) : (
          <div className="nt-dept-spend">
            <div className="nt-donut">
              <svg viewBox="0 0 100 100">
                {(() => {
                  const total = dept.reduce((s, d) => s + Number(d.total), 0) || 1;
                  let offset = 0;
                  return dept.map((d, i) => {
                    const frac = Number(d.total) / total;
                    const r = 40; const cx = 50; const cy = 50;
                    const circ = 2 * Math.PI * r;
                    const dash = frac * circ;
                    const el = (
                      <circle key={d.deptId} cx={cx} cy={cy} r={r} fill="none" strokeWidth="14"
                        stroke={`var(--${DEPT_COLORS[i % DEPT_COLORS.length]})`}
                        strokeDasharray={`${dash} ${circ - dash}`}
                        strokeDashoffset={-offset}
                        transform={`rotate(-90 ${cx} ${cy})`} />
                    );
                    offset += dash;
                    return el;
                  });
                })()}
                <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 5, fill: 'var(--muted)' }}>NET</text>
              </svg>
            </div>
            <ul className="nt-dept-list">
              {dept.map((d, i) => (
                <li key={d.deptId}>
                  <i className={`dot tone-${DEPT_COLORS[i % DEPT_COLORS.length]}`} />
                  <span className="nt-dept-name">{d.deptName}</span>
                  <span className="nt-dept-amount">{fmt(d.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Upcoming runs */}
      <div className="nt-card">
        <div className="nt-card-header">
          <span className="nt-card-title">Upcoming / draft runs</span>
        </div>
        {draftRuns.length === 0 ? (
          <p className="muted" style={{ padding: '16px' }}>No draft runs</p>
        ) : (
          <ul className="nt-runs">
            {draftRuns.map((run) => (
              <li key={run.id}>
                <div className="nt-run-main">
                  <div className="nt-run-title">{run.name}</div>
                  <div className="muted">{run.periodStart} – {run.periodEnd}</div>
                </div>
                <Pill tone={statusTone(run.status)}>{run.status}</Pill>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create run form */}
      <div className="nt-card">
        <div className="nt-card-header"><span className="nt-card-title">Create pay run</span></div>
        <form onSubmit={form.handleSubmit(onSubmit)} style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input {...form.register('name')} placeholder="Run name (e.g. May 2026 Monthly)" className="nt-input" />
          <div style={{ display: 'flex', gap: 8 }}>
            <input {...form.register('periodStart')} placeholder="Period start (YYYY-MM-DD)" className="nt-input" style={{ flex: 1 }} />
            <input {...form.register('periodEnd')} placeholder="Period end (YYYY-MM-DD)" className="nt-input" style={{ flex: 1 }} />
          </div>
          <button type="submit" className="nt-btn-primary" disabled={createMut.isPending}>
            {createMut.isPending ? 'Creating…' : 'Create pay run'}
          </button>
        </form>
      </div>
    </div>
  );
}
