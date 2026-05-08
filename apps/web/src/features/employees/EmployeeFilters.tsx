import { useEffect, useState } from 'react';
import { useDepartmentsQuery } from '../departments/hooks.js';
import type { EmployeeFilters as F } from './hooks.js';

export function EmployeeFilters({
  value,
  onChange,
}: {
  value: F;
  onChange: (next: F) => void;
}): JSX.Element {
  const [q, setQ] = useState(value.q ?? '');
  const dq = useDepartmentsQuery();

  useEffect(() => {
    const t = setTimeout(() => {
      if (q) {
        onChange({ ...value, q });
      } else {
        const { q: _q, ...rest } = value;
        onChange(rest);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="nt-filters">
      <input aria-label="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      <select
        aria-label="department"
        value={value.department ?? ''}
        onChange={(e) => {
          if (e.target.value) {
            onChange({ ...value, department: Number(e.target.value) });
          } else {
            const { department: _d, ...rest } = value;
            onChange(rest);
          }
        }}
      >
        <option value="">All departments</option>
        {dq.data?.data.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <select
        aria-label="status"
        value={value.status ?? ''}
        onChange={(e) => {
          if (e.target.value) {
            onChange({ ...value, status: e.target.value as NonNullable<F['status']> });
          } else {
            const { status: _s, ...rest } = value;
            onChange(rest);
          }
        }}
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="on_leave">On leave</option>
        <option value="terminated">Terminated</option>
      </select>
    </div>
  );
}
