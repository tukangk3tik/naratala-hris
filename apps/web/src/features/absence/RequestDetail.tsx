import type { LeaveRequestDTO } from '@naratala/shared';
import { useDecideRequest } from './hooks.js';
import { useState } from 'react';
import { ApiError } from '../../shared/api/ApiError.js';
import { toast } from 'sonner';

export function RequestDetail({ request, onActed }: { request: LeaveRequestDTO; onActed: () => void }): JSX.Element {
  const approve = useDecideRequest('approve');
  const decline = useDecideRequest('decline');
  const [note, setNote] = useState('');
  const isPending = request.status === 'pending';
  return (
    <aside className="nt-drawer" role="complementary" aria-label="request detail">
      <h3>{request.employeeName}</h3>
      <dl>
        <dt>Type</dt>
        <dd>{request.leaveType}</dd>
        <dt>Range</dt>
        <dd>{request.fromDate} → {request.toDate}</dd>
        <dt>Days</dt>
        <dd>{request.days}</dd>
        <dt>Status</dt>
        <dd>{request.status}</dd>
      </dl>
      {request.reason && (
        <section>
          <h4>Reason</h4>
          <blockquote>{request.reason}</blockquote>
        </section>
      )}
      {isPending && (
        <>
          <label>
            Note (optional)
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button
            type="button"
            disabled={approve.isPending}
            onClick={() =>
              approve.mutate(
                { id: request.id, ...(note ? { note } : {}) },
                {
                  onSuccess: () => onActed(),
                  onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Approve failed'),
                },
              )
            }
          >
            Approve {request.days} days
          </button>
          <button
            type="button"
            disabled={decline.isPending}
            onClick={() =>
              decline.mutate(
                { id: request.id, ...(note ? { note } : {}) },
                {
                  onSuccess: () => onActed(),
                  onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Decline failed'),
                },
              )
            }
          >
            Decline
          </button>
        </>
      )}
    </aside>
  );
}
