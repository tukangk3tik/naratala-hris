import { useState } from 'react';
import { Card } from '../../shared/ui/Card.js';
import { useScheduleQuery, useUpdateDefaultSchedule } from './hooks.js';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WorkingScheduleSettings(): JSX.Element {
  const q = useScheduleQuery();
  const m = useUpdateDefaultSchedule();
  const [bits, setBits] = useState<number | null>(null);
  const current = bits ?? q.data?.defaultWorkingDays ?? 0;
  return (
    <Card title="Working schedule">
      {q.isLoading && <p>Loading…</p>}
      {q.data && (
        <>
          <p>Company default — which days count as working days for absence math.</p>
          <div role="group" aria-label="working days">
            {DAY_LABELS.map((label, i) => (
              <label key={label}>
                <input
                  type="checkbox"
                  checked={(current & (1 << i)) !== 0}
                  onChange={(e) => {
                    const next = e.target.checked ? current | (1 << i) : current & ~(1 << i);
                    setBits(next);
                  }}
                />
                {label}
              </label>
            ))}
          </div>
          <button type="button" disabled={bits === null || m.isPending} onClick={() => m.mutate(current)}>
            Save default
          </button>
        </>
      )}
    </Card>
  );
}
