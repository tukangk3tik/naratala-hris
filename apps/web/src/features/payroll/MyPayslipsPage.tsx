import { useState } from 'react';
import { useMyPayslipsQuery } from './hooks.js';

function fmt(v: string) {
  return `Rp ${Number(v).toLocaleString('id-ID')}`;
}

export function MyPayslipsPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyPayslipsQuery(page);

  if (isLoading) return <div className="nt-fullpage-spinner" />;

  const payslips = data?.data ?? [];

  return (
    <div style={{ padding: '24px' }}>
      <h2>My Payslips</h2>
      {payslips.length === 0 ? (
        <p className="muted">No payslips yet.</p>
      ) : (
        <table className="nt-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Run name</th>
              <th>Gross</th>
              <th>Deduction</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {payslips.map((ps) => (
              <tr key={ps.id}>
                <td>{ps.salarySnapshot?.currency ?? '—'} · payslip #{ps.id}</td>
                <td>{fmt(ps.grossAmount)}</td>
                <td>{fmt(ps.deductionAmount)}</td>
                <td>{fmt(ps.netAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {(data?.data.length ?? 0) >= (data?.pageSize ?? 25) && (
        <button className="nt-icon-btn-line" onClick={() => setPage((p) => p + 1)} style={{ marginTop: 12 }}>
          Load more
        </button>
      )}
    </div>
  );
}
