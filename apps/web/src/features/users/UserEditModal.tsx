import { useState } from 'react';
import type { UserDTO } from '@naratala/shared';
import { usePatchUser } from './hooks.js';
import { ApiError } from '../../shared/api/ApiError.js';
import { toast } from 'sonner';

export function UserEditModal({
  user,
  onClose,
}: {
  user: UserDTO;
  onClose: () => void;
}): JSX.Element {
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [language, setLanguage] = useState(user.language);
  const m = usePatchUser();
  return (
    <div role="dialog" aria-label="edit user" className="nt-modal">
      <h3>{user.email}</h3>
      <label>
        Role
        <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
          <option value="admin">admin</option>
          <option value="hr">hr</option>
          <option value="manager">manager</option>
          <option value="employee">employee</option>
        </select>
      </label>
      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="active">active</option>
          <option value="pending">pending</option>
          <option value="disabled">disabled</option>
        </select>
      </label>
      <label>
        Language
        <select value={language} onChange={(e) => setLanguage(e.target.value as typeof language)}>
          <option value="id">Bahasa Indonesia</option>
          <option value="en">English</option>
        </select>
      </label>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
      <button
        type="button"
        disabled={m.isPending}
        onClick={() =>
          m.mutate(
            { id: user.id, patch: { role, status, language } },
            {
              onSuccess: onClose,
              onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Update failed'),
            },
          )
        }
      >
        Save
      </button>
    </div>
  );
}
