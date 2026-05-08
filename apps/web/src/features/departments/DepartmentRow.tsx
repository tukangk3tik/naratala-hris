import { useState } from 'react';
import type { DepartmentDTO } from '@naratala/shared';
import { useDeleteDepartment, useRenameDepartment } from './hooks.js';
import { usePermission } from '../../shared/permissions/usePermission.js';
import { toast } from 'sonner';
import { ApiError } from '../../shared/api/ApiError.js';

export function DepartmentRow({ d }: { d: DepartmentDTO }): JSX.Element {
  const canManage = usePermission('departments:manage');
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(d.name);
  const rename = useRenameDepartment();
  const del = useDeleteDepartment();
  return (
    <tr>
      <td>
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (name !== d.name) rename.mutate({ id: d.id, name });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setName(d.name);
                setEditing(false);
              }
            }}
            aria-label={`rename ${d.name}`}
            autoFocus
          />
        ) : (
          <button type="button" onClick={() => canManage && setEditing(true)} className="nt-link">
            {d.name}
          </button>
        )}
      </td>
      <td>{new Date(d.createdAt).toLocaleDateString()}</td>
      <td>
        {canManage && !confirming && (
          <button type="button" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
        {canManage && confirming && (
          <>
            <button
              type="button"
              onClick={() =>
                del.mutate(d.id, {
                  onSuccess: () => setConfirming(false),
                  onError: (e) => {
                    setConfirming(false);
                    toast.error(e instanceof ApiError ? e.message : 'Delete failed');
                  },
                })
              }
            >
              Yes
            </button>
            <button type="button" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
