import { and, asc, desc, eq, isNull, like, or, sql, type SQL } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { employees, departments } from '../../shared/db/schema.js';

export interface EmployeeRow {
  id: number;
  userId: number | null;
  fullName: string;
  email: string;
  phone: string | null;
  pronouns: string | null;
  departmentId: number;
  departmentName: string | null;
  position: string;
  location: string | null;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  employmentStatus: 'active' | 'on_leave' | 'terminated';
  hireDate: string;
  managerId: number | null;
  salaryAmount: string | null;
  salaryCurrency: string;
  avatarColorHue: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ListFilters {
  q?: string;
  departmentId?: number;
  status?: 'active' | 'on_leave' | 'terminated';
  page: number;
  pageSize: number;
  sort?: 'name' | 'hireDate' | 'department';
  sortDir?: 'asc' | 'desc';
}

export interface EmployeeRepo {
  list(f: ListFilters): Promise<{ rows: EmployeeRow[]; total: number }>;
  findById(id: number): Promise<EmployeeRow | undefined>;
  findByUserId(userId: number): Promise<EmployeeRow | undefined>;
  findByEmail(email: string): Promise<EmployeeRow | undefined>;
  create(
    input: Omit<EmployeeRow, 'id' | 'departmentName' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ): Promise<number>;
  update(id: number, patch: Partial<EmployeeRow>): Promise<void>;
  softDelete(id: number): Promise<void>;
  directReportIdsOfUserEmployee(userId: number): Promise<number[]>;
  employeeIdOfUser(userId: number): Promise<number | null>;
}

export function createEmployeeRepo(db: DB): EmployeeRepo {
  function base() {
    return db
      .select({
        id: employees.id,
        userId: employees.userId,
        fullName: employees.fullName,
        email: employees.email,
        phone: employees.phone,
        pronouns: employees.pronouns,
        departmentId: employees.departmentId,
        departmentName: departments.name,
        position: employees.position,
        location: employees.location,
        employmentType: employees.employmentType,
        employmentStatus: employees.employmentStatus,
        hireDate: employees.hireDate,
        managerId: employees.managerId,
        salaryAmount: employees.salaryAmount,
        salaryCurrency: employees.salaryCurrency,
        avatarColorHue: employees.avatarColorHue,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        deletedAt: employees.deletedAt,
      })
      .from(employees)
      .leftJoin(departments, eq(departments.id, employees.departmentId));
  }

  const repo: EmployeeRepo = {
    async list(f) {
      const conds: SQL[] = [isNull(employees.deletedAt)];
      if (f.q) {
        const search = or(
          like(employees.fullName, `%${f.q}%`),
          like(employees.email, `%${f.q}%`),
        );
        if (search) conds.push(search);
      }
      if (f.departmentId) conds.push(eq(employees.departmentId, f.departmentId));
      if (f.status) conds.push(eq(employees.employmentStatus, f.status));

      const sortCol =
        f.sort === 'hireDate'
          ? employees.hireDate
          : f.sort === 'department'
            ? departments.name
            : employees.fullName;
      const order = f.sortDir === 'desc' ? desc(sortCol) : asc(sortCol);

      const offset = (f.page - 1) * f.pageSize;
      const rows = await base()
        .where(and(...conds))
        .orderBy(order)
        .limit(f.pageSize)
        .offset(offset);

      const result = await db.execute<{ n: number }>(
        sql`SELECT COUNT(*) AS n FROM employees WHERE deleted_at IS NULL`,
      );
      const cRows = Array.isArray(result) ? result[0] : result;
      const cFirst = Array.isArray(cRows) ? cRows[0] : cRows;
      return {
        rows: rows as EmployeeRow[],
        total: Number((cFirst as { n?: number } | undefined)?.n ?? 0),
      };
    },

    async findById(id) {
      const [row] = await base()
        .where(and(eq(employees.id, id), isNull(employees.deletedAt)))
        .limit(1);
      return row as EmployeeRow | undefined;
    },
    async findByUserId(userId) {
      const [row] = await base()
        .where(and(eq(employees.userId, userId), isNull(employees.deletedAt)))
        .limit(1);
      return row as EmployeeRow | undefined;
    },
    async findByEmail(email) {
      const [row] = await base()
        .where(and(eq(employees.email, email), isNull(employees.deletedAt)))
        .limit(1);
      return row as EmployeeRow | undefined;
    },
    async create(input) {
      const [r] = await db
        .insert(employees)
        .values({
          userId: input.userId ?? null,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          pronouns: input.pronouns,
          departmentId: input.departmentId,
          position: input.position,
          location: input.location,
          employmentType: input.employmentType,
          employmentStatus: input.employmentStatus,
          hireDate: input.hireDate,
          managerId: input.managerId,
          salaryAmount: input.salaryAmount,
          salaryCurrency: input.salaryCurrency,
          avatarColorHue: input.avatarColorHue,
        })
        .$returningId();
      return r!.id;
    },
    async update(id, patch) {
      const next: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (
          k === 'id' ||
          k === 'createdAt' ||
          k === 'updatedAt' ||
          k === 'deletedAt' ||
          k === 'departmentName'
        )
          continue;
        next[k] = v;
      }
      if (Object.keys(next).length === 0) return;
      await db
        .update(employees)
        .set(next as Partial<typeof employees.$inferInsert>)
        .where(eq(employees.id, id));
    },
    async softDelete(id) {
      await db.update(employees).set({ deletedAt: new Date() }).where(eq(employees.id, id));
    },

    async directReportIdsOfUserEmployee(userId) {
      const me = await repo.findByUserId(userId);
      if (!me) return [];
      const rows = await db
        .select({ id: employees.id })
        .from(employees)
        .where(and(eq(employees.managerId, me.id), isNull(employees.deletedAt)));
      return rows.map((r) => r.id);
    },
    async employeeIdOfUser(userId) {
      const me = await repo.findByUserId(userId);
      return me?.id ?? null;
    },
  };
  return repo;
}
