import { useMemo, useState } from 'react';
import { useLeaveRequestsQuery, useHolidaysQuery } from './hooks.js';
import { Card } from '../../shared/ui/Card.js';

function monthRange(year: number, month: number): { from: string; to: string; days: string[] } {
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));
  const days: string[] = [];
  for (let d = new Date(first); d <= last; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10), days };
}

export function CalendarPage(): JSX.Element {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getUTCFullYear(), month: today.getUTCMonth() });
  const range = useMemo(() => monthRange(cursor.year, cursor.month), [cursor]);
  const requests = useLeaveRequestsQuery({ status: 'approved', from: range.from, to: range.to, page: 1, pageSize: 200 });
  const holidays = useHolidaysQuery(cursor.year);
  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of requests.data?.data ?? []) {
      for (const d of range.days) {
        if (d >= r.fromDate && d <= r.toDate) {
          m.set(d, [...(m.get(d) ?? []), r.employeeName]);
        }
      }
    }
    return m;
  }, [requests.data, range.days]);
  return (
    <Card
      title="Calendar"
      actions={
        <div>
          <button
            type="button"
            aria-label="previous month"
            onClick={() =>
              setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))
            }
          >
            ‹
          </button>
          <span>{cursor.year}-{String(cursor.month + 1).padStart(2, '0')}</span>
          <button
            type="button"
            aria-label="next month"
            onClick={() =>
              setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))
            }
          >
            ›
          </button>
        </div>
      }
    >
      <div className="nt-cal-grid">
        {range.days.map((d) => {
          const names = byDay.get(d) ?? [];
          const isHoliday = holidays.data?.data.some((h) => h.date === d);
          return (
            <div key={d} className={`nt-cal-cell ${isHoliday ? 'holiday' : ''}`} data-date={d}>
              <div className="nt-cal-num">{Number(d.slice(8))}</div>
              {names.slice(0, 3).map((n, i) => (
                <div key={i} className="nt-cal-pill">{n}</div>
              ))}
              {names.length > 3 && <div className="nt-cal-pill more">+{names.length - 3}</div>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
