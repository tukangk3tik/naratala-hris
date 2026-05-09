import { describe, it, expect } from 'vitest';
import { countDays, MON_FRI, ALL_DAYS } from './dayCounter.js';

describe('countDays', () => {
  const noHolidays = new Set<string>();
  it('Mon→Fri with Mon-Fri schedule = 5', () => {
    expect(countDays('2026-05-04', '2026-05-08', MON_FRI, noHolidays)).toBe(5);
  });
  it('Sat–Sun with Mon-Fri schedule = 0', () => {
    expect(countDays('2026-05-09', '2026-05-10', MON_FRI, noHolidays)).toBe(0);
  });
  it('Sat–Sun with all-days schedule = 2', () => {
    expect(countDays('2026-05-09', '2026-05-10', ALL_DAYS, noHolidays)).toBe(2);
  });
  it('skips holidays', () => {
    expect(countDays('2026-05-04', '2026-05-08', MON_FRI, new Set(['2026-05-07']))).toBe(4);
  });
  it('single day weekday = 1', () => {
    expect(countDays('2026-05-05', '2026-05-05', MON_FRI, noHolidays)).toBe(1);
  });
  it('throws when to < from', () => {
    expect(() => countDays('2026-05-08', '2026-05-04', MON_FRI, noHolidays)).toThrow();
  });
});
