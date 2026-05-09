import { useState } from 'react';
import { Card } from '../../shared/ui/Card.js';
import { useLeavePoliciesQuery, useUpdateLeavePolicy } from './hooks.js';

export function LeavePolicyPage(): JSX.Element {
  const q = useLeavePoliciesQuery();
  const m = useUpdateLeavePolicy();
  const [editing, setEditing] = useState<{ id: number; days: number } | null>(null);
  return (
    <Card title="Leave policies (defaults)">
      {q.isLoading && <p>Loading…</p>}
      {q.data && (
        <table className="nt-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Default days/year</th>
              <th>Paid</th>
              <th>Affects balance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {q.data.data.map((p) => (
              <tr key={p.id}>
                <td>{p.leaveType}</td>
                <td>
                  {editing?.id === p.id ? (
                    <input
                      type="number"
                      step="0.5"
                      value={editing.days}
                      aria-label={`days for ${p.leaveType}`}
                      onChange={(e) => setEditing({ id: p.id, days: Number(e.target.value) })}
                      onBlur={() => {
                        m.mutate({ id: p.id, defaultDaysPerYear: editing.days }, { onSettled: () => setEditing(null) });
                      }}
                      autoFocus
                    />
                  ) : (
                    <button type="button" onClick={() => setEditing({ id: p.id, days: Number(p.defaultDaysPerYear) })}>
                      {p.defaultDaysPerYear}
                    </button>
                  )}
                </td>
                <td>{p.isPaid ? '✓' : '—'}</td>
                <td>{p.affectsBalance ? '✓' : '—'}</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
