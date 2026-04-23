import 'dotenv/config';
import { createDb } from '../shared/db/client.js';
import { loadEnv } from '../shared/config/env.js';
import { seedDepartments } from './seedDepartments.js';
import { seedAdmin } from './seedAdmin.js';
import { seedDevEmployees } from './seedDevEmployees.js';

async function main() {
  const env = loadEnv();
  const { db, pool } = createDb(env.DATABASE_URL);
  try {
    await seedDepartments(db);
    const admin = await seedAdmin(db, env.INITIAL_ADMIN_EMAIL, env.INITIAL_ADMIN_PASSWORD);
    const employees = env.SEED_DEV_DATA ? await seedDevEmployees(db) : 0;
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({ msg: 'seed done', adminInserted: admin, devEmployees: employees }),
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
