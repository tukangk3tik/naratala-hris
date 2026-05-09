import { useState } from 'react';
import { Card } from '../../shared/ui/Card.js';
import { Pill } from '../../shared/ui/Pill.js';
import { useAuth } from '../../shared/auth/useAuth.js';
import { useBalancesQuery, useLeaveRequestsQuery, useCancelRequest } from './hooks.js';
import { BalanceBar } from './BalanceBar.js';
import { NewRequestModal } from './NewRequestModal.js';
import { toast } from 'sonner';
import { ApiError } from '../../shared/api/ApiError.js';

export function MyAbsencePage(): JSX.Element {
  const { user } = useAuth();
  const [showNew, setShowNew] = useState(false);
  const year = new Date().getUTCFullYear();
  const balances = useBalancesQuery(null, year);
  const requests = useLeaveRequestsQuery({ page: 1, pageSize: 50 });
  const cancel = useCancelRequest();
  if (!user) return <p>—</p>;
  return (
    <div className="nt-stack">
      <Card title="My time off" actions={<button type="button" onClick={() => setShowNew(true)}>Request time off</button>}>
        {balances.isLoading && <p>Loading…</p>}
        {balances.data && (
          <div className="nt-balance-stack">
            {balances.data.data.map((b) => (
              <BalanceBar key={b.leaveType} b={b} />
            ))}
          </div>
        )}
      </Card>
      <Card title="My requests">
        {requests.isLoading && <p>Loading…</p>}
        {requests.data && (
          <table className="nt-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.data.data.map((r) => (
                <tr key={r.id}>
                  <td>{r.leaveType}</td>
                  <td>{r.fromDate} → {r.toDate}</td>
                  <td>{r.days}</td>
                  <td>
                    <Pill tone={r.status === 'approved' ? 'good' : r.status === 'declined' ? 'bad' : 'neutral'}>{r.status}</Pill>
                  </td>
                  <td>
                    {(r.status === 'pending' || (r.status === 'approved' && r.fromDate > new Date().toISOString().slice(0, 10))) && (
                      <button
                        type="button"
                        onClick={() =>
                          cancel.mutate(r.id, {
                            onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Cancel failed'),
                          })
                        }
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {showNew && <NewRequestModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
