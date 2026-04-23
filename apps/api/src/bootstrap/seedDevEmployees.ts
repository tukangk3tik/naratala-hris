import { eq, sql } from 'drizzle-orm';
import type { DB } from '../shared/db/client.js';
import { departments, employees } from '../shared/db/schema.js';
import { hueFromName } from './avatarHue.js';

interface Row {
  fullName: string;
  email: string;
  departmentName: string;
  position: string;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  hireDate: string;
}

const DEV_EMPLOYEES: Row[] = [
  {
    fullName: 'Ayu Wulan',
    email: 'ayu@naratala.local',
    departmentName: 'Engineering',
    position: 'Senior Engineer',
    employmentType: 'full_time',
    hireDate: '2023-02-01',
  },
  {
    fullName: 'Budi Santoso',
    email: 'budi@naratala.local',
    departmentName: 'Engineering',
    position: 'Staff Engineer',
    employmentType: 'full_time',
    hireDate: '2021-06-15',
  },
  {
    fullName: 'Citra Dewi',
    email: 'citra@naratala.local',
    departmentName: 'Design',
    position: 'Product Designer',
    employmentType: 'full_time',
    hireDate: '2024-01-08',
  },
  {
    fullName: 'Dimas Prasetyo',
    email: 'dimas@naratala.local',
    departmentName: 'Engineering',
    position: 'Engineering Manager',
    employmentType: 'full_time',
    hireDate: '2020-11-02',
  },
  {
    fullName: 'Eka Putri',
    email: 'eka@naratala.local',
    departmentName: 'People',
    position: 'HR Partner',
    employmentType: 'full_time',
    hireDate: '2022-09-12',
  },
  {
    fullName: 'Fajar Rahman',
    email: 'fajar@naratala.local',
    departmentName: 'Finance',
    position: 'Finance Analyst',
    employmentType: 'full_time',
    hireDate: '2023-07-03',
  },
  {
    fullName: 'Gita Lestari',
    email: 'gita@naratala.local',
    departmentName: 'Marketing',
    position: 'Marketing Lead',
    employmentType: 'full_time',
    hireDate: '2022-03-21',
  },
  {
    fullName: 'Hadi Kurniawan',
    email: 'hadi@naratala.local',
    departmentName: 'Sales',
    position: 'Account Executive',
    employmentType: 'full_time',
    hireDate: '2024-05-10',
  },
  {
    fullName: 'Indah Permata',
    email: 'indah@naratala.local',
    departmentName: 'Operations',
    position: 'Ops Coordinator',
    employmentType: 'full_time',
    hireDate: '2023-10-18',
  },
  {
    fullName: 'Joko Pranata',
    email: 'joko@naratala.local',
    departmentName: 'Engineering',
    position: 'Engineer',
    employmentType: 'contract',
    hireDate: '2025-02-01',
  },
  {
    fullName: 'Kirana Anjani',
    email: 'kirana@naratala.local',
    departmentName: 'Design',
    position: 'Design Intern',
    employmentType: 'intern',
    hireDate: '2025-08-01',
  },
  {
    fullName: 'Lutfi Ramadhan',
    email: 'lutfi@naratala.local',
    departmentName: 'Engineering',
    position: 'Engineer',
    employmentType: 'full_time',
    hireDate: '2024-03-15',
  },
  {
    fullName: 'Maya Sari',
    email: 'maya@naratala.local',
    departmentName: 'People',
    position: 'Recruiter',
    employmentType: 'full_time',
    hireDate: '2024-06-20',
  },
  {
    fullName: 'Nadya Hartono',
    email: 'nadya@naratala.local',
    departmentName: 'Marketing',
    position: 'Content Strategist',
    employmentType: 'part_time',
    hireDate: '2024-09-01',
  },
  {
    fullName: 'Oka Saputra',
    email: 'oka@naratala.local',
    departmentName: 'Engineering',
    position: 'Engineer',
    employmentType: 'full_time',
    hireDate: '2023-12-05',
  },
];

export async function seedDevEmployees(db: DB): Promise<number> {
  const result = await db.execute<{ n: number }>(sql`SELECT COUNT(*) AS n FROM employees`);
  const rows = Array.isArray(result) ? result[0] : result;
  const first = Array.isArray(rows) ? rows[0] : rows;
  const count = Number((first as any)?.n ?? 0);
  if (count > 0) return 0;

  let inserted = 0;
  for (const row of DEV_EMPLOYEES) {
    const [dep] = await db
      .select()
      .from(departments)
      .where(eq(departments.name, row.departmentName));
    if (!dep) continue;
    await db.insert(employees).values({
      fullName: row.fullName,
      email: row.email,
      departmentId: dep.id,
      position: row.position,
      employmentType: row.employmentType,
      hireDate: row.hireDate,
      avatarColorHue: hueFromName(row.fullName),
    });
    inserted += 1;
  }
  return inserted;
}
