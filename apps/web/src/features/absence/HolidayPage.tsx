import { useState } from 'react';
import { Card } from '../../shared/ui/Card.js';
import { useHolidaysQuery, useCreateHoliday, useDeleteHoliday } from './hooks.js';

export function HolidayPage(): JSX.Element {
  const year = new Date().getUTCFullYear();
  const q = useHolidaysQuery(year);
  const create = useCreateHoliday();
  const del = useDeleteHoliday();
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');
  const [recurring, setRecurring] = useState(false);
  return (
    <Card title="Holidays">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(
            { date, label, recurringAnnually: recurring },
            {
              onSuccess: () => {
                setDate('');
                setLabel('');
                setRecurring(false);
              },
            },
          );
        }}
      >
        <label>
          Date
          <input aria-label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Label
          <input aria-label="Label" value={label} onChange={(e) => setLabel(e.target.value)} required />
        </label>
        <label>
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          Recurring annually
        </label>
        <button type="submit" disabled={create.isPending}>
          Add
        </button>
      </form>
      {q.isLoading && <p>Loading…</p>}
      {q.data && (
        <table className="nt-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Label</th>
              <th>Recurring</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {q.data.data.map((h) => (
              <tr key={h.id}>
                <td>{h.date}</td>
                <td>{h.label}</td>
                <td>{h.recurringAnnually ? '✓' : '—'}</td>
                <td>
                  <button type="button" onClick={() => del.mutate(h.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
