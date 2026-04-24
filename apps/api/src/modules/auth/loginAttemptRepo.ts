import { sql } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { loginAttempts } from '../../shared/db/schema.js';

export interface LoginAttemptRepo {
  record(email: string, ip: string, succeeded: boolean): Promise<void>;
  failedSince(email: string, since: Date): Promise<number>;
}

export function createLoginAttemptRepo(db: DB): LoginAttemptRepo {
  return {
    async record(email, ip, succeeded) {
      await db
        .insert(loginAttempts)
        .values({ email: email.toLowerCase(), ip: ip.slice(0, 45), succeeded });
    },
    async failedSince(email, since) {
      const result = await db.execute<{ n: number }>(
        sql`SELECT COUNT(*) AS n FROM login_attempts
              WHERE email = ${email.toLowerCase()} AND succeeded = 0 AND created_at >= ${since}`,
      );
      const rows = Array.isArray(result) ? result[0] : result;
      const first = Array.isArray(rows) ? rows[0] : rows;
      return Number((first as { n?: number } | undefined)?.n ?? 0);
    },
  };
}
