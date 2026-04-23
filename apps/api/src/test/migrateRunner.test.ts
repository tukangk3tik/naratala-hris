import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from './db.js';

describe('migrate runner (smoke)', () => {
  let ctx: TestDb;

  beforeAll(async () => {
    ctx = await createTestDb();
  });
  afterAll(async () => {
    await ctx.drop();
  });

  it('creates all 8 tables', async () => {
    const [rows] = await ctx.pool.query<any[]>(
      'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [ctx.dbName],
    );
    const names = new Set(rows.map((r) => r.name));
    for (const t of [
      'users',
      'employees',
      'departments',
      'refresh_tokens',
      'invites',
      'password_resets',
      'login_attempts',
      'audit_log',
    ]) {
      expect(names.has(t)).toBe(true);
    }
  });

  it('employees.email has a unique index', async () => {
    const [rows] = await ctx.pool.query<any[]>(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'email' AND NON_UNIQUE = 0`,
      [ctx.dbName],
    );
    expect(rows.length).toBeGreaterThan(0);
  });
});
