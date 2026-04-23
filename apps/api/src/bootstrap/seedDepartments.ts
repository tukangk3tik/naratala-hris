import { sql } from 'drizzle-orm';
import type { DB } from '../shared/db/client.js';
import { departments } from '../shared/db/schema.js';

const DEPARTMENTS = [
  'Engineering',
  'Design',
  'People',
  'Finance',
  'Marketing',
  'Sales',
  'Operations',
];

export async function seedDepartments(db: DB): Promise<void> {
  for (const name of DEPARTMENTS) {
    await db
      .insert(departments)
      .values({ name })
      .onDuplicateKeyUpdate({ set: { name: sql`name` } });
  }
}
