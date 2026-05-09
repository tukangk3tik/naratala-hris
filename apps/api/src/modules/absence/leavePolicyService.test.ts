import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createLeavePolicyRepo } from './leavePolicyRepo.js';
import { createLeavePolicyService } from './leavePolicyService.js';

describe('leavePolicyService', () => {
  let ctx: TestDb;
  let svc: ReturnType<typeof createLeavePolicyService>;
  beforeAll(async () => {
    ctx = await createTestDb();
    svc = createLeavePolicyService(createLeavePolicyRepo(ctx.db));
  });
  afterAll(async () => {
    await ctx.drop();
  });

  it('seed migration produced 6 rows', async () => {
    const list = await svc.list();
    expect(list.length).toBe(6);
    const vac = list.find((p) => p.leaveType === 'vacation');
    expect(vac?.defaultDaysPerYear).toBe('20.00');
  });

  it('update changes a policy field', async () => {
    const all = await svc.list();
    const vac = all.find((p) => p.leaveType === 'vacation')!;
    const updated = await svc.update(vac.id, { defaultDaysPerYear: 25 });
    expect(updated.defaultDaysPerYear).toBe('25.00');
  });
});
