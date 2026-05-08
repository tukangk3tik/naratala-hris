import { useState } from 'react';
import { useAuditQuery, type AuditFilters } from './hooks.js';
import { AuditRow } from './AuditRow.js';
import { Card } from '../../shared/ui/Card.js';

export function AuditPage(): JSX.Element {
  const [filters, setFilters] = useState<AuditFilters>({ page: 1, pageSize: 50 });
  const q = useAuditQuery(filters);
  return (
    <Card title="Audit log">
      <div className="nt-filters">
        <select
          aria-label="action"
          value={filters.action ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value || undefined }))}
        >
          <option value="">All actions</option>
          <option value="employee.update">employee.update</option>
          <option value="employee.create">employee.create</option>
          <option value="employee.delete">employee.delete</option>
          <option value="user.update">user.update</option>
          <option value="invite.create">invite.create</option>
        </select>
        <select
          aria-label="entityType"
          value={filters.entityType ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value || undefined }))}
        >
          <option value="">All entities</option>
          <option value="employee">employee</option>
          <option value="user">user</option>
          <option value="invite">invite</option>
          <option value="department">department</option>
        </select>
      </div>
      {q.isLoading && <p>Loading…</p>}
      {q.data && (
        <table className="nt-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>ID</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {q.data.data.map((r) => (
              <AuditRow key={r.id} row={r} />
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
