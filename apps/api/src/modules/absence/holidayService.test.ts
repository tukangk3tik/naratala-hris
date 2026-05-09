import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createHolidayRepo } from './holidayRepo.js';
import { createHolidayService } from './holidayService.js';

describe('holidayService', () => {
  let ctx: TestDb;
  let svc: ReturnType<typeof createHolidayService>;

  beforeAll(async () => {
    ctx = await createTestDb();
    svc = createHolidayService(createHolidayRepo(ctx.db));
  });
  afterAll(async () => {
    await ctx.drop();
  });

  it('CRUD round-trip', async () => {
    const h = await svc.create({ date: '2026-05-01', label: 'Labor Day', recurringAnnually: true });
    const list = await svc.list(2026);
    expect(list.find((r) => r.id === h.id)?.label).toBe('Labor Day');
    await svc.update(h.id, { label: 'May Day' });
    const updated = await svc.list(2026);
    expect(updated.find((r) => r.id === h.id)?.label).toBe('May Day');
    await svc.remove(h.id);
    expect((await svc.list(2026)).find((r) => r.id === h.id)).toBeUndefined();
  });

  it('expandDates yields recurring holiday for both years', async () => {
    await svc.create({ date: '2026-05-01', label: 'Labor', recurringAnnually: true });
    const set = await svc.expandDates('2025-01-01', '2027-01-01');
    expect(set.has('2025-05-01')).toBe(true);
    expect(set.has('2026-05-01')).toBe(true);
  });
});
