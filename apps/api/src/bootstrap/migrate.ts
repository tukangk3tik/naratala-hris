import 'dotenv/config';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { createDb } from '../shared/db/client.js';
import { loadEnv } from '../shared/config/env.js';

async function main() {
  const env = loadEnv();
  const { db, pool } = createDb(env.DATABASE_URL);
  await migrate(db, { migrationsFolder: './drizzle' });
  await pool.end();
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ msg: 'migrations applied' }));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
