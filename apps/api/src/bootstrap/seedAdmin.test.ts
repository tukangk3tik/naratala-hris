import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../test/db.js';
import { seedAdmin } from './seedAdmin.js';

describe('seedAdmin', () => {
  let ctx: TestDb;
  beforeAll(async () => {
    ctx = await createTestDb();
  });
  afterAll(async () => {
    await ctx.drop();
  });

  it('inserts admin on first call', async () => {
    const inserted = await seedAdmin(ctx.db, 'admin@naratala.local', 'dev-password-12');
    expect(inserted).toBe(true);
    const [rows] = await ctx.pool.query<any[]>(
      'SELECT role, status, must_change_password FROM users',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].role).toBe('admin');
    expect(rows[0].status).toBe('active');
    expect(Number(rows[0].must_change_password)).toBe(1);
  });

  it('is a no-op when users exist', async () => {
    const again = await seedAdmin(ctx.db, 'admin@naratala.local', 'dev-password-12');
    expect(again).toBe(false);
    const [rows] = await ctx.pool.query<any[]>('SELECT COUNT(*) AS n FROM users');
    expect(Number(rows[0].n)).toBe(1);
  });
});
