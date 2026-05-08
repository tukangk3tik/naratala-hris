import { useState, useEffect } from 'react';
import type { EmployeeDTO } from '@naratala/shared';
import { useEmployeeQuery, useDeleteEmployee } from './hooks.js';
import { EmployeeForm } from './EmployeeForm.js';
import { usePermission } from '../../shared/permissions/usePermission.js';
import { useNavigate } from 'react-router-dom';

export function EmployeeDrawer({ id }: { id: number }): JSX.Element {
  const q = useEmployeeQuery(id);
  const nav = useNavigate();
  const canEdit = usePermission('employees:write:any');
  const canDelete = usePermission('employees:write:any');
  const del = useDeleteEmployee();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') nav('/employees');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav]);

  if (q.isLoading) return <aside className="nt-drawer">Loading…</aside>;
  if (q.error || !q.data) return <aside className="nt-drawer">Not found</aside>;
  const e: EmployeeDTO = q.data;

  return (
    <aside className="nt-drawer" role="complementary" aria-label="employee details">
      <header>
        <h2>{e.fullName}</h2>
        <button type="button" onClick={() => nav('/employees')} aria-label="close">
          ×
        </button>
      </header>
      {editing ? (
        <EmployeeForm employee={e} onClose={() => setEditing(false)} />
      ) : (
        <>
          <section>
            <h3>Personal</h3>
            <dl>
              <dt>Email</dt>
              <dd>{e.email}</dd>
              <dt>Phone</dt>
              <dd>{e.phone ?? '—'}</dd>
              <dt>Pronouns</dt>
              <dd>{e.pronouns ?? '—'}</dd>
            </dl>
          </section>
          <section>
            <h3>Employment</h3>
            <dl>
              <dt>Department</dt>
              <dd>{e.departmentName ?? '—'}</dd>
              <dt>Type</dt>
              <dd>{e.employmentType}</dd>
              <dt>Status</dt>
              <dd>{e.employmentStatus}</dd>
              <dt>Hired</dt>
              <dd>{e.hireDate}</dd>
            </dl>
          </section>
          <section>
            <h3>Compensation</h3>
            {e.salaryAmount ? (
              <p>
                {e.salaryAmount} {e.salaryCurrency}
              </p>
            ) : (
              <span className="nt-pill tone-neutral">Hidden</span>
            )}
          </section>
          {canEdit && (
            <button type="button" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          {canDelete && !confirming && (
            <button type="button" onClick={() => setConfirming(true)}>
              Delete
            </button>
          )}
          {confirming && (
            <>
              <button
                type="button"
                onClick={() =>
                  del.mutate(e.id, { onSuccess: () => nav('/employees') })
                }
              >
                Confirm delete
              </button>
              <button type="button" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </>
          )}
        </>
      )}
    </aside>
  );
}
