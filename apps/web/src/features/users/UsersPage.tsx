import { useState } from 'react';
import { useUsersQuery, useForceLogoutUser } from './hooks.js';
import { UserEditModal } from './UserEditModal.js';
import { Card } from '../../shared/ui/Card.js';
import { Pill } from '../../shared/ui/Pill.js';
import { toast } from 'sonner';
import type { UserDTO } from '@naratala/shared';

export function UsersPage(): JSX.Element {
  const q = useUsersQuery({ page: 1, pageSize: 50 });
  const force = useForceLogoutUser();
  const [editing, setEditing] = useState<UserDTO | null>(null);
  return (
    <Card title="Users">
      {q.isLoading && <p>Loading…</p>}
      {q.data && (
        <table className="nt-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>MFA</th>
              <th>Last login</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {q.data.data.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>
                  <Pill tone={u.role === 'admin' ? 'info' : 'neutral'}>{u.role}</Pill>
                </td>
                <td>
                  <Pill tone={u.status === 'active' ? 'good' : 'warn'}>{u.status}</Pill>
                </td>
                <td>{u.mfaEnabled ? '✓' : '—'}</td>
                <td>{u.lastLoginAt ?? '—'}</td>
                <td>
                  <button type="button" onClick={() => setEditing(u)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      force.mutate(u.id, {
                        onSuccess: () => toast.success('Sessions revoked'),
                      })
                    }
                  >
                    Force logout
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editing && <UserEditModal user={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}
