export const ALL_DAYS = 0b1111111;
export const MON_FRI = 0b0111110;

export function countDays(
  fromIso: string,
  toIso: string,
  workingDays: number,
  holidays: ReadonlySet<string>,
): number {
  const from = new Date(`${fromIso}T00:00:00.000Z`);
  const to = new Date(`${toIso}T00:00:00.000Z`);
  if (to.getTime() < from.getTime()) throw new RangeError('to < from');
  let n = 0;
  const cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    const dow = cursor.getUTCDay();
    const iso = cursor.toISOString().slice(0, 10);
    if (workingDays & (1 << dow) && !holidays.has(iso)) n += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return n;
}
