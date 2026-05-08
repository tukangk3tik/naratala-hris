import { useState } from 'react';
import type { AuditEntry } from './hooks.js';
import { Pill } from '../../shared/ui/Pill.js';

export function AuditRow({ row }: { row: AuditEntry }): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr>
        <td>{new Date(row.createdAt).toLocaleString()}</td>
        <td>{row.actorEmail}</td>
        <td>
          <Pill tone="info">{row.action}</Pill>
        </td>
        <td>{row.entityType}</td>
        <td>{row.entityId ?? '—'}</td>
        <td>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? 'Hide' : 'Show'}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6}>
            <pre className="nt-audit-json">{JSON.stringify({ before: row.before, after: row.after }, null, 2)}</pre>
          </td>
        </tr>
      )}
    </>
  );
}
