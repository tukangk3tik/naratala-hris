import { useState } from 'react';
import { useDepartmentsQuery, useCreateDepartment } from './hooks.js';
import { DepartmentRow } from './DepartmentRow.js';
import { Card } from '../../shared/ui/Card.js';
import { usePermission } from '../../shared/permissions/usePermission.js';

export function DepartmentsPage(): JSX.Element {
  const q = useDepartmentsQuery();
  const create = useCreateDepartment();
  const canManage = usePermission('departments:manage');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  return (
    <Card
      title="Departments"
      actions={
        canManage && !creating ? (
          <button type="button" onClick={() => setCreating(true)}>
            New department
          </button>
        ) : null
      }
    >
      {creating && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(name, {
              onSuccess: () => {
                setCreating(false);
                setName('');
              },
            });
          }}
        >
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <button type="submit">Create</button>
          <button type="button" onClick={() => setCreating(false)}>
            Cancel
          </button>
        </form>
      )}
      {q.isLoading && <p>Loading…</p>}
      {q.data && (
        <table className="nt-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {q.data.data.map((d) => (
              <DepartmentRow key={d.id} d={d} />
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
