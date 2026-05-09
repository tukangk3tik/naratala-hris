import type { HolidayRepo, HolidayRow } from './holidayRepo.js';
import { NotFoundError } from '../../shared/errors/index.js';

export type HolidayService = ReturnType<typeof createHolidayService>;

export function createHolidayService(repo: HolidayRepo) {
  return {
    list: (year: number) => repo.listByYear(year),
    create: (v: { date: string; label: string; recurringAnnually?: boolean }) =>
      repo.insert({ date: v.date, label: v.label, recurringAnnually: v.recurringAnnually ?? false }),
    update: async (id: number, v: Partial<{ date: string; label: string; recurringAnnually: boolean }>) => {
      const r = await repo.update(id, v);
      if (!r) throw new NotFoundError('holiday not found');
      return r;
    },
    remove: (id: number) => repo.remove(id),
    expandDates: async (fromIso: string, toIso: string): Promise<Set<string>> => {
      const all: HolidayRow[] = await repo.listAll();
      const out = new Set<string>();
      const fromYear = Number(fromIso.slice(0, 4));
      const toYear = Number(toIso.slice(0, 4));
      for (const h of all) {
        if (!h.recurringAnnually) {
          if (h.date >= fromIso && h.date <= toIso) out.add(h.date);
          continue;
        }
        const mmdd = h.date.slice(5);
        for (let y = fromYear; y <= toYear; y++) {
          const candidate = `${y}-${mmdd}`;
          if (candidate >= fromIso && candidate <= toIso) out.add(candidate);
        }
      }
      return out;
    },
  };
}
