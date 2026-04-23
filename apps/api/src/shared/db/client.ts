import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';

export type DB = MySql2Database<typeof schema>;

export function createDb(url: string) {
  const pool = mysql.createPool({ uri: url, connectionLimit: 10, multipleStatements: false });
  const db = drizzle(pool, { schema, mode: 'default' }) as DB;
  return { db, pool };
}

export { schema };
