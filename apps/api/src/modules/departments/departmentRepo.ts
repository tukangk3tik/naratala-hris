import { asc, eq, sql } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { departments } from '../../shared/db/schema.js';

export interface DepartmentRow {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentRepo {
  list(): Promise<DepartmentRow[]>;
  findById(id: number): Promise<DepartmentRow | undefined>;
  findByName(name: string): Promise<DepartmentRow | undefined>;
  create(name: string): Promise<number>;
  updateName(id: number, name: string): Promise<void>;
  delete(id: number): Promise<void>;
  countEmployees(id: number): Promise<number>;
}

export function createDepartmentRepo(db: DB): DepartmentRepo {
  return {
    async list() {
      return (await db
        .select()
        .from(departments)
        .orderBy(asc(departments.name))) as DepartmentRow[];
    },
    async findById(id) {
      const [row] = await db
        .select()
        .from(departments)
        .where(eq(departments.id, id))
        .limit(1);
      return row as DepartmentRow | undefined;
    },
    async findByName(name) {
      const [row] = await db
        .select()
        .from(departments)
        .where(eq(departments.name, name))
        .limit(1);
      return row as DepartmentRow | undefined;
    },
    async create(name) {
      const [r] = await db.insert(departments).values({ name }).$returningId();
      return r!.id;
    },
    async updateName(id, name) {
      await db.update(departments).set({ name }).where(eq(departments.id, id));
    },
    async delete(id) {
      await db.delete(departments).where(eq(departments.id, id));
    },
    async countEmployees(id) {
      const result = await db.execute<{ n: number }>(
        sql`SELECT COUNT(*) AS n FROM employees WHERE department_id = ${id} AND deleted_at IS NULL`,
      );
      const rows = Array.isArray(result) ? result[0] : result;
      const first = Array.isArray(rows) ? rows[0] : rows;
      return Number((first as { n?: number } | undefined)?.n ?? 0);
    },
  };
}
