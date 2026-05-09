import type { BalanceDTO } from '@naratala/shared';

export function BalanceBar({ b }: { b: BalanceDTO }): JSX.Element {
  const quota = Number(b.quota);
  const used = Number(b.used);
  const pending = Number(b.pending);
  const usedPct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  const pendingPct = quota > 0 ? Math.min(100 - usedPct, (pending / quota) * 100) : 0;
  return (
    <div className="nt-balance" data-leave-type={b.leaveType}>
      <div className="nt-balance-top">
        <span>{b.leaveType}</span>
        <span className="nt-balance-num">
          {used}+{pending}<span className="muted">/{quota}</span>
        </span>
      </div>
      <div className="nt-balance-track">
        <div className="nt-balance-fill used" style={{ width: `${usedPct}%` }} />
        <div className="nt-balance-fill pending" style={{ width: `${pendingPct}%` }} />
      </div>
    </div>
  );
}
