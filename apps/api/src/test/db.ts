import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { randomUUID } from 'node:crypto';
import * as schema from '../shared/db/schema.js';

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

export async function createTestDb() {
  const base = process.env.DATABASE_URL ?? 'mysql://naratala:dev@127.0.0.1:3306/naratala';
  const url = new URL(base);
  const dbName = `naratala_test_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

  const admin = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    multipleStatements: true,
  });
  await admin.query(
    `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  );
  await admin.end();

  const pool = mysql.createPool({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: dbName,
    connectionLimit: 5,
    multipleStatements: false,
  });
  const db = drizzle(pool, { schema, mode: 'default' });
  await migrate(db, { migrationsFolder: './drizzle' });

  async function drop() {
    await pool.end();
    const a = await mysql.createConnection({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    });
    await a.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await a.end();
  }

  async function truncateAll() {
    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const table of [
        'audit_log',
        'login_attempts',
        'password_resets',
        'invites',
        'refresh_tokens',
        'employees',
        'users',
        'departments',
      ]) {
        await conn.query(`TRUNCATE TABLE \`${table}\``);
      }
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      conn.release();
    }
  }

  return { db, pool, dbName, drop, truncateAll };
}
