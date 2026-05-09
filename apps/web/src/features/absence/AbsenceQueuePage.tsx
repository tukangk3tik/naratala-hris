import { useState } from 'react';
import type { LeaveRequestDTO } from '@naratala/shared';
import { Card } from '../../shared/ui/Card.js';
import { useLeaveRequestsQuery } from './hooks.js';
import { RequestDetail } from './RequestDetail.js';

export function AbsenceQueuePage(): JSX.Element {
  const [filter, setFilter] = useState<'pending' | 'approved' | undefined>('pending');
  const q = useLeaveRequestsQuery({ status: filter, page: 1, pageSize: 50 });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected: LeaveRequestDTO | null = q.data?.data.find((r) => r.id === selectedId) ?? q.data?.data[0] ?? null;
  return (
    <div className="nt-absence-layout">
      <div className="nt-queue-col">
        <Card
          title="Approval queue"
          subtitle={q.data ? `${q.data.total} requests` : ''}
          actions={
            <div>
              <button type="button" aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>
                Pending
              </button>
              <button type="button" aria-pressed={filter === 'approved'} onClick={() => setFilter('approved')}>
                Approved
              </button>
              <button type="button" aria-pressed={filter === undefined} onClick={() => setFilter(undefined)}>
                All
              </button>
            </div>
          }
        >
          {q.isLoading && <p>Loading…</p>}
          {q.data && q.data.data.length === 0 && <p>All caught up — nothing to review.</p>}
          {q.data && (
            <ul className="nt-request-list">
              {q.data.data.map((r) => (
                <li key={r.id} aria-current={selected?.id === r.id} onClick={() => setSelectedId(r.id)}>
                  <strong>{r.employeeName}</strong> — {r.leaveType} · {r.days} days · {r.fromDate} → {r.toDate}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {selected && <RequestDetail request={selected} onActed={() => setSelectedId(null)} />}
    </div>
  );
}
