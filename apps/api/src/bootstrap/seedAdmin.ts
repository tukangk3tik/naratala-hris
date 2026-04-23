import bcrypt from 'bcrypt';
import { sql } from 'drizzle-orm';
import type { DB } from '../shared/db/client.js';
import { users } from '../shared/db/schema.js';

export async function seedAdmin(db: DB, email: string, password: string): Promise<boolean> {
  const result = await db.execute<{ n: number }>(sql`SELECT COUNT(*) AS n FROM users`);
  const rows = Array.isArray(result) ? result[0] : result;
  const first = Array.isArray(rows) ? rows[0] : rows;
  const count = Number((first as any)?.n ?? 0);
  if (count > 0) return false;

  const hash = await bcrypt.hash(password, 12);
  await db.insert(users).values({
    email: email.toLowerCase(),
    passwordHash: hash,
    role: 'admin',
    status: 'active',
    mustChangePassword: true,
  });
  return true;
}
