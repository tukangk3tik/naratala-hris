# Phase 3 Absence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the absence/time-off feature end-to-end — backend module + frontend SPA wiring — supporting per-employee work schedules, per-company holidays, manager-only approval (with HR override), and per-employee quota overrides.

**Architecture:** New `apps/api/src/modules/absence/` module mirrors existing module shape (repo + service + routes). Five new tables + one column addition; pure `dayCounter` and `balanceService` keep business logic testable. Frontend reuses Phase 2 SPA shell, RHF/zodResolver against new shared schemas, MSW for tests. Forward-compat via `decimal(5,2)` storage so half-day support is a future column-add only.

**Tech Stack:** Drizzle ORM (MySQL), Express 4, Zod, Vitest + supertest (api), TanStack Query 5, React Hook Form 7, react-i18next, MSW 2, Testing Library (web). Reuses Phase 1 mailer/audit/auth/jwt + Phase 2 `apiFetch`/`AuthProvider`/`Shell`.

**Reference spec:** `docs/superpowers/specs/2026-05-08-absence-design.md`

---

## File Structure

```
apps/api/
├── drizzle/
│   └── 0001_absence.sql                                  # generated
├── src/
│   ├── shared/db/schema.ts                               # extended (employees.workingDays + 5 tables)
│   ├── bootstrap/wireApp.ts                              # extended
│   ├── shared/mail/templates.ts                          # extended (3 absence templates)
│   └── modules/absence/
│       ├── dayCounter.ts                                 # pure
│       ├── dayCounter.test.ts
│       ├── holidayRepo.ts
│       ├── holidayService.ts
│       ├── holidayService.test.ts
│       ├── leavePolicyRepo.ts
│       ├── leavePolicyService.ts
│       ├── leavePolicyService.test.ts
│       ├── leaveQuotaRepo.ts
│       ├── leaveQuotaService.ts
│       ├── leaveQuotaService.test.ts
│       ├── workingScheduleRepo.ts
│       ├── workingScheduleService.ts
│       ├── workingScheduleService.test.ts
│       ├── balanceService.ts
│       ├── balanceService.test.ts
│       ├── leaveRequestRepo.ts
│       ├── leaveRequestService.ts
│       ├── leaveRequestService.test.ts
│       ├── leaveRequestRoutes.ts
│       ├── leaveRequestRoutes.test.ts
│       ├── holidayRoutes.ts
│       ├── leavePolicyRoutes.ts
│       └── workingScheduleRoutes.ts
│   └── test/permissionMatrix.test.ts                     # extended
│
packages/shared/src/
├── permissions.ts                                        # extended (8 new perms)
└── schemas/
    ├── absence.ts                                        # NEW
    └── index.ts                                          # extended

apps/web/src/
├── shared/api/queries.ts                                 # extended (qk.absence)
├── shared/ui/Shell.tsx                                   # nav extended
├── shared/i18n/locales/{id,en}.json                      # absence.* keys
├── app/routes.tsx                                        # extended
└── features/absence/
    ├── hooks.ts
    ├── NewRequestModal.tsx
    ├── NewRequestModal.test.tsx
    ├── MyAbsencePage.tsx
    ├── MyAbsencePage.test.tsx
    ├── AbsenceQueuePage.tsx
    ├── AbsenceQueuePage.test.tsx
    ├── RequestDetail.tsx
    ├── BalanceBar.tsx
    ├── CalendarPage.tsx
    ├── CalendarPage.test.tsx
    ├── LeavePolicyPage.tsx
    ├── LeavePolicyPage.test.tsx
    ├── HolidayPage.tsx
    ├── HolidayPage.test.tsx
    └── WorkingScheduleSettings.tsx
```

---

## Task 1: Drizzle schema + migration

**Files:**
- Modify: `apps/api/src/shared/db/schema.ts` (add `workingDays` to employees + 5 new tables)
- Create: `apps/api/drizzle/0001_absence.sql` (generated)
- Create: `apps/api/src/test/db.ts` — extend `truncateAll` table list

- [ ] **Step 1.1: Extend `employees` table**

In `apps/api/src/shared/db/schema.ts`, inside the `employees` table definition (after `salaryCurrency` line), add:

```ts
    workingDays: smallint('working_days'),
```

- [ ] **Step 1.2: Append 5 new tables to `schema.ts`**

At the end of `apps/api/src/shared/db/schema.ts`, append:

```ts
export const companySettings = mysqlTable('company_settings', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey(),
  defaultWorkingDays: smallint('default_working_days').notNull().default(62),
  ...ts,
});

export const leavePolicies = mysqlTable(
  'leave_policies',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    leaveType: mysqlEnum('leave_type', [
      'vacation',
      'sick',
      'personal',
      'bereavement',
      'parental',
      'unpaid',
    ]).notNull(),
    defaultDaysPerYear: decimal('default_days_per_year', { precision: 5, scale: 2 }).notNull(),
    isPaid: boolean('is_paid').notNull(),
    affectsBalance: boolean('affects_balance').notNull(),
    ...ts,
  },
  (t) => ({ leaveTypeUnique: uniqueIndex('leave_policies_type_unique').on(t.leaveType) }),
);

export const leaveQuotas = mysqlTable(
  'leave_quotas',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull(),
    leaveType: mysqlEnum('leave_type', [
      'vacation',
      'sick',
      'personal',
      'bereavement',
      'parental',
      'unpaid',
    ]).notNull(),
    daysPerYear: decimal('days_per_year', { precision: 5, scale: 2 }).notNull(),
    ...ts,
  },
  (t) => ({
    empTypeUnique: uniqueIndex('leave_quotas_emp_type_unique').on(t.employeeId, t.leaveType),
  }),
);

export const holidays = mysqlTable(
  'holidays',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    date: date('date', { mode: 'string' }).notNull(),
    label: varchar('label', { length: 120 }).notNull(),
    recurringAnnually: boolean('recurring_annually').notNull().default(false),
    ...ts,
  },
  (t) => ({
    dateLabelUnique: uniqueIndex('holidays_date_label_unique').on(t.date, t.label),
    dateIdx: index('holidays_date_idx').on(t.date),
  }),
);

export const leaveRequests = mysqlTable(
  'leave_requests',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull(),
    actorUserId: bigint('actor_user_id', { mode: 'number', unsigned: true }).notNull(),
    leaveType: mysqlEnum('leave_type', [
      'vacation',
      'sick',
      'personal',
      'bereavement',
      'parental',
      'unpaid',
    ]).notNull(),
    fromDate: date('from_date', { mode: 'string' }).notNull(),
    toDate: date('to_date', { mode: 'string' }).notNull(),
    days: decimal('days', { precision: 5, scale: 2 }).notNull(),
    reason: varchar('reason', { length: 500 }),
    status: mysqlEnum('status', ['pending', 'approved', 'declined', 'cancelled'])
      .notNull()
      .default('pending'),
    decidedByUserId: bigint('decided_by_user_id', { mode: 'number', unsigned: true }),
    decidedAt: datetime('decided_at', { fsp: 3 }),
    decisionNote: varchar('decision_note', { length: 500 }),
    cancelledByUserId: bigint('cancelled_by_user_id', { mode: 'number', unsigned: true }),
    cancelledAt: datetime('cancelled_at', { fsp: 3 }),
    ...ts,
  },
  (t) => ({
    empFromIdx: index('leave_requests_emp_from_idx').on(t.employeeId, t.fromDate),
    statusFromIdx: index('leave_requests_status_from_idx').on(t.status, t.fromDate),
    fromIdx: index('leave_requests_from_idx').on(t.fromDate),
  }),
);
```

- [ ] **Step 1.3: Generate migration**

Run: `cd apps/api && pnpm db:generate`
Expected: new file `apps/api/drizzle/0001_*.sql` is created.

- [ ] **Step 1.4: Append seed statements to migration**

Open the new generated file (`apps/api/drizzle/0001_*.sql`), append at the end:

```sql
INSERT INTO `company_settings` (`id`, `default_working_days`) VALUES (1, 62);

INSERT INTO `leave_policies` (`leave_type`, `default_days_per_year`, `is_paid`, `affects_balance`) VALUES
  ('vacation',    20.00, 1, 1),
  ('sick',        10.00, 1, 1),
  ('personal',     5.00, 1, 1),
  ('bereavement',  3.00, 1, 1),
  ('parental',    90.00, 1, 1),
  ('unpaid',       0.00, 0, 0);
```

- [ ] **Step 1.5: Extend test `truncateAll` to include new tables**

In `apps/api/src/test/db.ts` `truncateAll` array, prepend (before `audit_log`):

```ts
        'leave_requests',
        'holidays',
        'leave_quotas',
        'leave_policies',
        'company_settings',
```

- [ ] **Step 1.6: Run migration locally to confirm**

Run: `cd apps/api && pnpm db:migrate`
Expected: migration applies cleanly; rerun is idempotent.

- [ ] **Step 1.7: Commit**

```bash
git add apps/api/src/shared/db/schema.ts apps/api/drizzle/ apps/api/src/test/db.ts
git commit -m "feat(absence): drizzle schema + migration with seeded policies"
```

---

## Task 2: Permissions extension

**Files:**
- Modify: `packages/shared/src/permissions.ts`
- Modify: `packages/shared/src/permissions.test.ts`

- [ ] **Step 2.1: Write failing test**

In `packages/shared/src/permissions.test.ts`, add inside the existing `describe`:

```ts
  it('grants absence permissions per role spec', () => {
    expect(hasPermission('admin', 'absence:configure')).toBe(true);
    expect(hasPermission('hr', 'absence:configure')).toBe(true);
    expect(hasPermission('hr', 'absence:approve:any')).toBe(true);
    expect(hasPermission('manager', 'absence:approve:reports')).toBe(true);
    expect(hasPermission('manager', 'absence:approve:any')).toBe(false);
    expect(hasPermission('employee', 'absence:write:self')).toBe(true);
    expect(hasPermission('employee', 'absence:read:any')).toBe(false);
  });
```

- [ ] **Step 2.2: Run — fails**

Run: `pnpm --filter @naratala/shared test`
Expected: FAIL — types missing.

- [ ] **Step 2.3: Extend `Permission` union and `ROLE_PERMISSIONS`**

In `packages/shared/src/permissions.ts`, extend `Permission`:

```ts
  | 'absence:read:self'
  | 'absence:read:reports'
  | 'absence:read:any'
  | 'absence:write:self'
  | 'absence:write:any'
  | 'absence:approve:reports'
  | 'absence:approve:any'
  | 'absence:configure';
```

In `ROLE_PERMISSIONS`:

```ts
  admin: [
    /* …existing… */
    'absence:read:self',
    'absence:read:reports',
    'absence:read:any',
    'absence:write:self',
    'absence:write:any',
    'absence:approve:reports',
    'absence:approve:any',
    'absence:configure',
  ],
  hr: [
    /* …existing… */
    'absence:read:self',
    'absence:read:reports',
    'absence:read:any',
    'absence:write:self',
    'absence:write:any',
    'absence:approve:any',
    'absence:configure',
  ],
  manager: [
    /* …existing… */
    'absence:read:self',
    'absence:read:reports',
    'absence:write:self',
    'absence:write:any',
    'absence:approve:reports',
  ],
  employee: [
    /* …existing… */
    'absence:read:self',
    'absence:write:self',
  ],
```

- [ ] **Step 2.4: Run — passes**

Run: `pnpm --filter @naratala/shared test`
Expected: PASS.

- [ ] **Step 2.5: Commit**

```bash
git add packages/shared/src/permissions.ts packages/shared/src/permissions.test.ts
git commit -m "feat(shared): add absence permissions for all 4 roles"
```

---

## Task 3: Shared zod schemas + DTOs

**Files:**
- Create: `packages/shared/src/schemas/absence.ts`
- Modify: `packages/shared/src/schemas/index.ts`
- Modify: `packages/shared/src/schemas/schemas.test.ts`

- [ ] **Step 3.1: Write failing test**

In `packages/shared/src/schemas/schemas.test.ts`, append:

```ts
import {
  LeaveType,
  LeaveRequestCreate,
  LeaveDecisionBody,
  HolidayCreate,
  WorkingScheduleUpdate,
} from './absence.js';

describe('absence schemas', () => {
  it('LeaveType enum', () => {
    expect(LeaveType.options).toContain('vacation');
    expect(LeaveType.options).toContain('unpaid');
  });

  it('LeaveRequestCreate accepts valid input', () => {
    const r = LeaveRequestCreate.parse({
      leaveType: 'vacation',
      fromDate: '2026-05-04',
      toDate: '2026-05-08',
    });
    expect(r.leaveType).toBe('vacation');
  });

  it('LeaveRequestCreate rejects to<from', () => {
    expect(() =>
      LeaveRequestCreate.parse({
        leaveType: 'vacation',
        fromDate: '2026-05-08',
        toDate: '2026-05-04',
      }),
    ).toThrow();
  });

  it('HolidayCreate validates date format', () => {
    expect(() => HolidayCreate.parse({ date: 'bad', label: 'X' })).toThrow();
    expect(HolidayCreate.parse({ date: '2026-05-01', label: 'Labor Day' }).label).toBe('Labor Day');
  });

  it('WorkingScheduleUpdate clamps to 0–127', () => {
    expect(WorkingScheduleUpdate.parse({ workingDays: 62 }).workingDays).toBe(62);
    expect(() => WorkingScheduleUpdate.parse({ workingDays: 256 })).toThrow();
  });

  it('LeaveDecisionBody allows empty + note', () => {
    expect(LeaveDecisionBody.parse({}).note).toBeUndefined();
    expect(LeaveDecisionBody.parse({ note: 'ok' }).note).toBe('ok');
  });
});
```

- [ ] **Step 3.2: Run — fails**

Run: `pnpm --filter @naratala/shared test`
Expected: FAIL — module not found.

- [ ] **Step 3.3: Create `absence.ts`**

```ts
// packages/shared/src/schemas/absence.ts
import { z } from 'zod';
import { IsoDate } from './common.js';

export const LeaveType = z.enum(['vacation', 'sick', 'personal', 'bereavement', 'parental', 'unpaid']);
export type LeaveTypeT = z.infer<typeof LeaveType>;

export const LeaveStatus = z.enum(['pending', 'approved', 'declined', 'cancelled']);
export type LeaveStatusT = z.infer<typeof LeaveStatus>;

export const LeaveRequestCreate = z
  .object({
    employeeId: z.number().int().positive().optional(),
    leaveType: LeaveType,
    fromDate: IsoDate,
    toDate: IsoDate,
    reason: z.string().max(500).optional(),
  })
  .strict()
  .refine((v) => v.fromDate <= v.toDate, {
    message: 'toDate must be ≥ fromDate',
    path: ['toDate'],
  });

export const LeaveDecisionBody = z
  .object({ note: z.string().max(500).optional() })
  .strict();

export const HolidayCreate = z
  .object({
    date: IsoDate,
    label: z.string().min(1).max(120),
    recurringAnnually: z.boolean().optional().default(false),
  })
  .strict();

export const HolidayUpdate = HolidayCreate.partial();

export const LeavePolicyUpdate = z
  .object({
    defaultDaysPerYear: z.number().nonnegative().max(366).optional(),
    isPaid: z.boolean().optional(),
    affectsBalance: z.boolean().optional(),
  })
  .strict();

export const LeaveQuotaUpsert = z
  .object({ daysPerYear: z.number().nonnegative().max(366) })
  .strict();

export const WorkingScheduleUpdate = z
  .object({
    workingDays: z.number().int().min(0).max(127).nullable(),
  })
  .strict();

export interface LeaveRequestDTO {
  id: number;
  employeeId: number;
  employeeName: string;
  actorUserId: number;
  leaveType: LeaveTypeT;
  fromDate: string;
  toDate: string;
  days: string;
  reason: string | null;
  status: LeaveStatusT;
  decidedByUserId: number | null;
  decidedAt: string | null;
  decisionNote: string | null;
  cancelledByUserId: number | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BalanceDTO {
  leaveType: LeaveTypeT;
  quota: string;
  used: string;
  pending: string;
  available: string;
}

export interface HolidayDTO {
  id: number;
  date: string;
  label: string;
  recurringAnnually: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeavePolicyDTO {
  id: number;
  leaveType: LeaveTypeT;
  defaultDaysPerYear: string;
  isPaid: boolean;
  affectsBalance: boolean;
}
```

- [ ] **Step 3.4: Re-export from `index.ts`**

In `packages/shared/src/schemas/index.ts`, append:

```ts
export * from './absence.js';
```

- [ ] **Step 3.5: Run — passes**

Run: `pnpm --filter @naratala/shared test`
Expected: PASS.

- [ ] **Step 3.6: Commit**

```bash
git add packages/shared/src/schemas/
git commit -m "feat(shared): absence zod schemas + DTOs"
```

---

## Task 4: dayCounter (pure)

**Files:**
- Create: `apps/api/src/modules/absence/dayCounter.ts`
- Create: `apps/api/src/modules/absence/dayCounter.test.ts`

- [ ] **Step 4.1: Write failing test**

```ts
// apps/api/src/modules/absence/dayCounter.test.ts
import { describe, it, expect } from 'vitest';
import { countDays, MON_FRI, ALL_DAYS } from './dayCounter.js';

describe('countDays', () => {
  const noHolidays = new Set<string>();
  it('Mon→Fri with Mon-Fri schedule = 5', () => {
    expect(countDays('2026-05-04', '2026-05-08', MON_FRI, noHolidays)).toBe(5);
  });
  it('Sat–Sun with Mon-Fri schedule = 0', () => {
    expect(countDays('2026-05-09', '2026-05-10', MON_FRI, noHolidays)).toBe(0);
  });
  it('Sat–Sun with all-days schedule = 2', () => {
    expect(countDays('2026-05-09', '2026-05-10', ALL_DAYS, noHolidays)).toBe(2);
  });
  it('skips holidays', () => {
    expect(countDays('2026-05-04', '2026-05-08', MON_FRI, new Set(['2026-05-07']))).toBe(4);
  });
  it('single day weekday = 1', () => {
    expect(countDays('2026-05-05', '2026-05-05', MON_FRI, noHolidays)).toBe(1);
  });
  it('throws when to < from', () => {
    expect(() => countDays('2026-05-08', '2026-05-04', MON_FRI, noHolidays)).toThrow();
  });
});
```

- [ ] **Step 4.2: Run — fails**

Run: `pnpm --filter api test dayCounter`
Expected: FAIL.

- [ ] **Step 4.3: Implement**

```ts
// apps/api/src/modules/absence/dayCounter.ts
export const ALL_DAYS = 0b1111111;
export const MON_FRI = 0b0111110;

export function countDays(
  fromIso: string,
  toIso: string,
  workingDays: number,
  holidays: ReadonlySet<string>,
): number {
  const from = new Date(`${fromIso}T00:00:00.000Z`);
  const to = new Date(`${toIso}T00:00:00.000Z`);
  if (to.getTime() < from.getTime()) throw new RangeError('to < from');
  let n = 0;
  const cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    const dow = cursor.getUTCDay();
    const iso = cursor.toISOString().slice(0, 10);
    if (workingDays & (1 << dow) && !holidays.has(iso)) n += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return n;
}
```

- [ ] **Step 4.4: Run — passes**

Run: `pnpm --filter api test dayCounter`
Expected: PASS (6 tests).

- [ ] **Step 4.5: Commit**

```bash
git add apps/api/src/modules/absence/dayCounter.ts apps/api/src/modules/absence/dayCounter.test.ts
git commit -m "feat(absence): pure dayCounter respecting workingDays + holidays"
```

---

## Task 5: holidayRepo + holidayService

**Files:**
- Create: `apps/api/src/modules/absence/holidayRepo.ts`
- Create: `apps/api/src/modules/absence/holidayService.ts`
- Create: `apps/api/src/modules/absence/holidayService.test.ts`

- [ ] **Step 5.1: Write failing test**

```ts
// apps/api/src/modules/absence/holidayService.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createHolidayRepo } from './holidayRepo.js';
import { createHolidayService } from './holidayService.js';

describe('holidayService', () => {
  let ctx: TestDb;
  let svc: ReturnType<typeof createHolidayService>;

  beforeAll(async () => {
    ctx = await createTestDb();
    svc = createHolidayService(createHolidayRepo(ctx.db));
  });
  afterAll(async () => {
    await ctx.drop();
  });

  it('CRUD round-trip', async () => {
    const h = await svc.create({ date: '2026-05-01', label: 'Labor Day', recurringAnnually: true });
    const list = await svc.list(2026);
    expect(list.find((r) => r.id === h.id)?.label).toBe('Labor Day');
    await svc.update(h.id, { label: 'May Day' });
    const updated = await svc.list(2026);
    expect(updated.find((r) => r.id === h.id)?.label).toBe('May Day');
    await svc.remove(h.id);
    expect((await svc.list(2026)).find((r) => r.id === h.id)).toBeUndefined();
  });

  it('expandDates yields recurring holiday for both years', async () => {
    await svc.create({ date: '2026-05-01', label: 'Labor', recurringAnnually: true });
    const set = await svc.expandDates('2025-01-01', '2027-01-01');
    expect(set.has('2025-05-01')).toBe(true);
    expect(set.has('2026-05-01')).toBe(true);
  });
});
```

- [ ] **Step 5.2: Run — fails**

Run: `pnpm --filter api test holidayService`
Expected: FAIL.

- [ ] **Step 5.3: Implement repo**

```ts
// apps/api/src/modules/absence/holidayRepo.ts
import { and, eq, gte, lte } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { holidays } from '../../shared/db/schema.js';

export type HolidayRow = typeof holidays.$inferSelect;
export type HolidayRepo = ReturnType<typeof createHolidayRepo>;

export function createHolidayRepo(db: DB) {
  return {
    listByYear: (year: number) =>
      db
        .select()
        .from(holidays)
        .where(and(gte(holidays.date, `${year}-01-01`), lte(holidays.date, `${year}-12-31`))),
    listAll: () => db.select().from(holidays),
    insert: async (v: { date: string; label: string; recurringAnnually: boolean }) => {
      const [r] = await db.insert(holidays).values(v).$returningId();
      const [row] = await db.select().from(holidays).where(eq(holidays.id, r!.id));
      return row!;
    },
    update: async (id: number, v: Partial<{ date: string; label: string; recurringAnnually: boolean }>) => {
      await db.update(holidays).set(v).where(eq(holidays.id, id));
      const [row] = await db.select().from(holidays).where(eq(holidays.id, id));
      return row!;
    },
    remove: (id: number) => db.delete(holidays).where(eq(holidays.id, id)),
  };
}
```

- [ ] **Step 5.4: Implement service**

```ts
// apps/api/src/modules/absence/holidayService.ts
import type { HolidayRepo, HolidayRow } from './holidayRepo.js';
import { NotFoundError } from '../../shared/errors/index.js';

export type HolidayService = ReturnType<typeof createHolidayService>;

export function createHolidayService(repo: HolidayRepo) {
  return {
    list: (year: number) => repo.listByYear(year),
    create: (v: { date: string; label: string; recurringAnnually?: boolean }) =>
      repo.insert({ date: v.date, label: v.label, recurringAnnually: v.recurringAnnually ?? false }),
    update: async (id: number, v: Partial<{ date: string; label: string; recurringAnnually: boolean }>) => {
      const r = await repo.update(id, v);
      if (!r) throw new NotFoundError('holiday not found');
      return r;
    },
    remove: (id: number) => repo.remove(id),
    expandDates: async (fromIso: string, toIso: string): Promise<Set<string>> => {
      const all: HolidayRow[] = await repo.listAll();
      const out = new Set<string>();
      const fromYear = Number(fromIso.slice(0, 4));
      const toYear = Number(toIso.slice(0, 4));
      for (const h of all) {
        if (!h.recurringAnnually) {
          if (h.date >= fromIso && h.date <= toIso) out.add(h.date);
          continue;
        }
        const mmdd = h.date.slice(5);
        for (let y = fromYear; y <= toYear; y++) {
          const candidate = `${y}-${mmdd}`;
          if (candidate >= fromIso && candidate <= toIso) out.add(candidate);
        }
      }
      return out;
    },
  };
}
```

- [ ] **Step 5.5: Run — passes**

Run: `pnpm --filter api test holidayService`
Expected: PASS (2 tests).

- [ ] **Step 5.6: Commit**

```bash
git add apps/api/src/modules/absence/holidayRepo.ts apps/api/src/modules/absence/holidayService.ts apps/api/src/modules/absence/holidayService.test.ts
git commit -m "feat(absence): holiday repo + service with recurring expansion"
```

---

## Task 6: leavePolicyRepo + leavePolicyService

**Files:**
- Create: `apps/api/src/modules/absence/leavePolicyRepo.ts`
- Create: `apps/api/src/modules/absence/leavePolicyService.ts`
- Create: `apps/api/src/modules/absence/leavePolicyService.test.ts`

- [ ] **Step 6.1: Write failing test**

```ts
// apps/api/src/modules/absence/leavePolicyService.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createLeavePolicyRepo } from './leavePolicyRepo.js';
import { createLeavePolicyService } from './leavePolicyService.js';

describe('leavePolicyService', () => {
  let ctx: TestDb;
  let svc: ReturnType<typeof createLeavePolicyService>;
  beforeAll(async () => {
    ctx = await createTestDb();
    svc = createLeavePolicyService(createLeavePolicyRepo(ctx.db));
  });
  afterAll(async () => {
    await ctx.drop();
  });

  it('seed migration produced 6 rows', async () => {
    const list = await svc.list();
    expect(list.length).toBe(6);
    const vac = list.find((p) => p.leaveType === 'vacation');
    expect(vac?.defaultDaysPerYear).toBe('20.00');
  });

  it('update changes a policy field', async () => {
    const all = await svc.list();
    const vac = all.find((p) => p.leaveType === 'vacation')!;
    const updated = await svc.update(vac.id, { defaultDaysPerYear: 25 });
    expect(updated.defaultDaysPerYear).toBe('25.00');
  });
});
```

- [ ] **Step 6.2: Run — fails**

Run: `pnpm --filter api test leavePolicyService`
Expected: FAIL.

- [ ] **Step 6.3: Implement repo**

```ts
// apps/api/src/modules/absence/leavePolicyRepo.ts
import { eq } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { leavePolicies } from '../../shared/db/schema.js';

export type LeavePolicyRow = typeof leavePolicies.$inferSelect;
export type LeavePolicyRepo = ReturnType<typeof createLeavePolicyRepo>;

export function createLeavePolicyRepo(db: DB) {
  return {
    list: () => db.select().from(leavePolicies),
    findById: async (id: number) => {
      const [r] = await db.select().from(leavePolicies).where(eq(leavePolicies.id, id));
      return r ?? null;
    },
    update: async (
      id: number,
      v: Partial<{ defaultDaysPerYear: string; isPaid: boolean; affectsBalance: boolean }>,
    ) => {
      await db.update(leavePolicies).set(v).where(eq(leavePolicies.id, id));
      const [row] = await db.select().from(leavePolicies).where(eq(leavePolicies.id, id));
      return row!;
    },
  };
}
```

- [ ] **Step 6.4: Implement service**

```ts
// apps/api/src/modules/absence/leavePolicyService.ts
import type { LeavePolicyRepo } from './leavePolicyRepo.js';
import { NotFoundError } from '../../shared/errors/index.js';

export type LeavePolicyService = ReturnType<typeof createLeavePolicyService>;

export function createLeavePolicyService(repo: LeavePolicyRepo) {
  return {
    list: () => repo.list(),
    update: async (
      id: number,
      v: { defaultDaysPerYear?: number; isPaid?: boolean; affectsBalance?: boolean },
    ) => {
      const existing = await repo.findById(id);
      if (!existing) throw new NotFoundError('policy not found');
      const patch: Partial<{ defaultDaysPerYear: string; isPaid: boolean; affectsBalance: boolean }> = {};
      if (v.defaultDaysPerYear !== undefined) patch.defaultDaysPerYear = v.defaultDaysPerYear.toFixed(2);
      if (v.isPaid !== undefined) patch.isPaid = v.isPaid;
      if (v.affectsBalance !== undefined) patch.affectsBalance = v.affectsBalance;
      return repo.update(id, patch);
    },
  };
}
```

- [ ] **Step 6.5: Run — passes**

Run: `pnpm --filter api test leavePolicyService`
Expected: PASS (2 tests).

- [ ] **Step 6.6: Commit**

```bash
git add apps/api/src/modules/absence/leavePolicyRepo.ts apps/api/src/modules/absence/leavePolicyService.ts apps/api/src/modules/absence/leavePolicyService.test.ts
git commit -m "feat(absence): leave policy repo + service"
```

---

## Task 7: workingScheduleService

**Files:**
- Create: `apps/api/src/modules/absence/workingScheduleRepo.ts`
- Create: `apps/api/src/modules/absence/workingScheduleService.ts`
- Create: `apps/api/src/modules/absence/workingScheduleService.test.ts`

- [ ] **Step 7.1: Write failing test**

```ts
// apps/api/src/modules/absence/workingScheduleService.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createWorkingScheduleRepo } from './workingScheduleRepo.js';
import { createWorkingScheduleService } from './workingScheduleService.js';
import { departments, employees } from '../../shared/db/schema.js';

describe('workingScheduleService', () => {
  let ctx: TestDb;
  let svc: ReturnType<typeof createWorkingScheduleService>;
  let empId = 0;

  beforeAll(async () => {
    ctx = await createTestDb();
    svc = createWorkingScheduleService(createWorkingScheduleRepo(ctx.db));
    const [d] = await ctx.db.insert(departments).values({ name: 'X' }).$returningId();
    const [e] = await ctx.db
      .insert(employees)
      .values({
        fullName: 'A',
        email: 'a@n.local',
        departmentId: d!.id,
        position: 'p',
        employmentType: 'full_time',
        hireDate: '2024-01-01',
        avatarColorHue: 1,
      })
      .$returningId();
    empId = e!.id;
  });
  afterAll(async () => {
    await ctx.drop();
  });

  it('default is company default when no override', async () => {
    expect(await svc.workingDaysFor(empId)).toBe(62);
  });

  it('override wins', async () => {
    await svc.setEmployeeOverride(empId, 127);
    expect(await svc.workingDaysFor(empId)).toBe(127);
  });

  it('null clears override', async () => {
    await svc.setEmployeeOverride(empId, null);
    expect(await svc.workingDaysFor(empId)).toBe(62);
  });

  it('updateDefault changes the company-wide value', async () => {
    await svc.updateDefault(127);
    expect(await svc.workingDaysFor(empId)).toBe(127);
  });
});
```

- [ ] **Step 7.2: Run — fails**

Run: `pnpm --filter api test workingScheduleService`
Expected: FAIL.

- [ ] **Step 7.3: Implement repo**

```ts
// apps/api/src/modules/absence/workingScheduleRepo.ts
import { eq, isNotNull } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { companySettings, employees } from '../../shared/db/schema.js';

export type WorkingScheduleRepo = ReturnType<typeof createWorkingScheduleRepo>;

export function createWorkingScheduleRepo(db: DB) {
  return {
    findEmployee: async (id: number) => {
      const [r] = await db
        .select({ id: employees.id, workingDays: employees.workingDays })
        .from(employees)
        .where(eq(employees.id, id));
      return r ?? null;
    },
    setEmployeeOverride: (id: number, workingDays: number | null) =>
      db.update(employees).set({ workingDays }).where(eq(employees.id, id)),
    getDefault: async () => {
      const [row] = await db.select().from(companySettings).where(eq(companySettings.id, 1));
      return row!.defaultWorkingDays;
    },
    setDefault: (workingDays: number) =>
      db.update(companySettings).set({ defaultWorkingDays: workingDays }).where(eq(companySettings.id, 1)),
    listOverrides: () =>
      db
        .select({ employeeId: employees.id, workingDays: employees.workingDays })
        .from(employees)
        .where(isNotNull(employees.workingDays)),
  };
}
```

- [ ] **Step 7.4: Implement service**

```ts
// apps/api/src/modules/absence/workingScheduleService.ts
import type { WorkingScheduleRepo } from './workingScheduleRepo.js';
import { NotFoundError } from '../../shared/errors/index.js';

export type WorkingScheduleService = ReturnType<typeof createWorkingScheduleService>;

export function createWorkingScheduleService(repo: WorkingScheduleRepo) {
  return {
    workingDaysFor: async (employeeId: number) => {
      const emp = await repo.findEmployee(employeeId);
      if (!emp) throw new NotFoundError('employee not found');
      if (emp.workingDays !== null) return emp.workingDays;
      return repo.getDefault();
    },
    setEmployeeOverride: (employeeId: number, value: number | null) =>
      repo.setEmployeeOverride(employeeId, value),
    updateDefault: (value: number) => repo.setDefault(value),
    snapshot: async () => ({
      defaultWorkingDays: await repo.getDefault(),
      perEmployeeOverrides: await repo.listOverrides(),
    }),
  };
}
```

- [ ] **Step 7.5: Run — passes**

Run: `pnpm --filter api test workingScheduleService`
Expected: PASS (4 tests).

- [ ] **Step 7.6: Commit**

```bash
git add apps/api/src/modules/absence/workingScheduleRepo.ts apps/api/src/modules/absence/workingScheduleService.ts apps/api/src/modules/absence/workingScheduleService.test.ts
git commit -m "feat(absence): working schedule service (default + per-employee override)"
```

---

## Task 8: leaveQuotaService (override resolver)

**Files:**
- Create: `apps/api/src/modules/absence/leaveQuotaRepo.ts`
- Create: `apps/api/src/modules/absence/leaveQuotaService.ts`
- Create: `apps/api/src/modules/absence/leaveQuotaService.test.ts`

- [ ] **Step 8.1: Write failing test**

```ts
// apps/api/src/modules/absence/leaveQuotaService.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createLeaveQuotaRepo } from './leaveQuotaRepo.js';
import { createLeavePolicyRepo } from './leavePolicyRepo.js';
import { createLeaveQuotaService } from './leaveQuotaService.js';
import { departments, employees } from '../../shared/db/schema.js';

describe('leaveQuotaService', () => {
  let ctx: TestDb;
  let svc: ReturnType<typeof createLeaveQuotaService>;
  let empId = 0;

  beforeAll(async () => {
    ctx = await createTestDb();
    svc = createLeaveQuotaService({
      quotas: createLeaveQuotaRepo(ctx.db),
      policies: createLeavePolicyRepo(ctx.db),
    });
    const [d] = await ctx.db.insert(departments).values({ name: 'X' }).$returningId();
    const [e] = await ctx.db
      .insert(employees)
      .values({
        fullName: 'A',
        email: 'a@n.local',
        departmentId: d!.id,
        position: 'p',
        employmentType: 'full_time',
        hireDate: '2024-01-01',
        avatarColorHue: 1,
      })
      .$returningId();
    empId = e!.id;
  });
  afterAll(async () => {
    await ctx.drop();
  });

  it('falls back to policy default', async () => {
    expect(await svc.quotaFor(empId, 'vacation')).toBe(20);
  });

  it('override wins', async () => {
    await svc.upsertOverride(empId, 'vacation', 25);
    expect(await svc.quotaFor(empId, 'vacation')).toBe(25);
  });

  it('removeOverride reverts to default', async () => {
    await svc.removeOverride(empId, 'vacation');
    expect(await svc.quotaFor(empId, 'vacation')).toBe(20);
  });

  it('listForEmployee returns only overrides', async () => {
    await svc.upsertOverride(empId, 'sick', 12);
    const list = await svc.listForEmployee(empId);
    expect(list.find((q) => q.leaveType === 'sick')?.daysPerYear).toBe('12.00');
  });
});
```

- [ ] **Step 8.2: Run — fails**

Run: `pnpm --filter api test leaveQuotaService`
Expected: FAIL.

- [ ] **Step 8.3: Implement repo**

```ts
// apps/api/src/modules/absence/leaveQuotaRepo.ts
import { and, eq } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { leaveQuotas } from '../../shared/db/schema.js';
import type { LeaveTypeT } from '@naratala/shared';

export type LeaveQuotaRow = typeof leaveQuotas.$inferSelect;
export type LeaveQuotaRepo = ReturnType<typeof createLeaveQuotaRepo>;

export function createLeaveQuotaRepo(db: DB) {
  return {
    find: async (employeeId: number, leaveType: LeaveTypeT) => {
      const [r] = await db
        .select()
        .from(leaveQuotas)
        .where(and(eq(leaveQuotas.employeeId, employeeId), eq(leaveQuotas.leaveType, leaveType)));
      return r ?? null;
    },
    listForEmployee: (employeeId: number) =>
      db.select().from(leaveQuotas).where(eq(leaveQuotas.employeeId, employeeId)),
    upsert: async (employeeId: number, leaveType: LeaveTypeT, daysPerYear: string) => {
      const [existing] = await db
        .select()
        .from(leaveQuotas)
        .where(and(eq(leaveQuotas.employeeId, employeeId), eq(leaveQuotas.leaveType, leaveType)));
      if (existing) {
        await db.update(leaveQuotas).set({ daysPerYear }).where(eq(leaveQuotas.id, existing.id));
        const [row] = await db.select().from(leaveQuotas).where(eq(leaveQuotas.id, existing.id));
        return row!;
      }
      const [r] = await db
        .insert(leaveQuotas)
        .values({ employeeId, leaveType, daysPerYear })
        .$returningId();
      const [row] = await db.select().from(leaveQuotas).where(eq(leaveQuotas.id, r!.id));
      return row!;
    },
    remove: (employeeId: number, leaveType: LeaveTypeT) =>
      db
        .delete(leaveQuotas)
        .where(and(eq(leaveQuotas.employeeId, employeeId), eq(leaveQuotas.leaveType, leaveType))),
  };
}
```

- [ ] **Step 8.4: Implement service**

```ts
// apps/api/src/modules/absence/leaveQuotaService.ts
import type { LeaveQuotaRepo } from './leaveQuotaRepo.js';
import type { LeavePolicyRepo } from './leavePolicyRepo.js';
import type { LeaveTypeT } from '@naratala/shared';

interface Deps {
  quotas: LeaveQuotaRepo;
  policies: LeavePolicyRepo;
}

export type LeaveQuotaService = ReturnType<typeof createLeaveQuotaService>;

export function createLeaveQuotaService(deps: Deps) {
  return {
    quotaFor: async (employeeId: number, leaveType: LeaveTypeT): Promise<number> => {
      const override = await deps.quotas.find(employeeId, leaveType);
      if (override) return Number(override.daysPerYear);
      const policies = await deps.policies.list();
      const p = policies.find((x) => x.leaveType === leaveType);
      return p ? Number(p.defaultDaysPerYear) : 0;
    },
    upsertOverride: (employeeId: number, leaveType: LeaveTypeT, daysPerYear: number) =>
      deps.quotas.upsert(employeeId, leaveType, daysPerYear.toFixed(2)),
    removeOverride: (employeeId: number, leaveType: LeaveTypeT) =>
      deps.quotas.remove(employeeId, leaveType),
    listForEmployee: (employeeId: number) => deps.quotas.listForEmployee(employeeId),
  };
}
```

- [ ] **Step 8.5: Run — passes**

Run: `pnpm --filter api test leaveQuotaService`
Expected: PASS (4 tests).

- [ ] **Step 8.6: Commit**

```bash
git add apps/api/src/modules/absence/leaveQuotaRepo.ts apps/api/src/modules/absence/leaveQuotaService.ts apps/api/src/modules/absence/leaveQuotaService.test.ts
git commit -m "feat(absence): leave quota service (override > default)"
```

---

## Task 9: balanceService

**Files:**
- Create: `apps/api/src/modules/absence/balanceService.ts`
- Create: `apps/api/src/modules/absence/balanceService.test.ts`

- [ ] **Step 9.1: Write failing test**

```ts
// apps/api/src/modules/absence/balanceService.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createBalanceService } from './balanceService.js';
import { createLeaveQuotaService } from './leaveQuotaService.js';
import { createLeaveQuotaRepo } from './leaveQuotaRepo.js';
import { createLeavePolicyRepo } from './leavePolicyRepo.js';
import { departments, employees, leaveRequests } from '../../shared/db/schema.js';

describe('balanceService', () => {
  let ctx: TestDb;
  let svc: ReturnType<typeof createBalanceService>;
  let empId = 0;

  beforeAll(async () => {
    ctx = await createTestDb();
    const [d] = await ctx.db.insert(departments).values({ name: 'X' }).$returningId();
    const [e] = await ctx.db
      .insert(employees)
      .values({
        fullName: 'A',
        email: 'a@n.local',
        departmentId: d!.id,
        position: 'p',
        employmentType: 'full_time',
        hireDate: '2024-01-01',
        avatarColorHue: 1,
      })
      .$returningId();
    empId = e!.id;
    svc = createBalanceService({
      db: ctx.db,
      quotas: createLeaveQuotaService({
        quotas: createLeaveQuotaRepo(ctx.db),
        policies: createLeavePolicyRepo(ctx.db),
      }),
    });
    await ctx.db.insert(leaveRequests).values([
      {
        employeeId: empId,
        actorUserId: 1,
        leaveType: 'vacation',
        fromDate: '2026-01-05',
        toDate: '2026-01-09',
        days: '5.00',
        status: 'approved',
      },
      {
        employeeId: empId,
        actorUserId: 1,
        leaveType: 'vacation',
        fromDate: '2026-06-01',
        toDate: '2026-06-03',
        days: '3.00',
        status: 'pending',
      },
      {
        employeeId: empId,
        actorUserId: 1,
        leaveType: 'vacation',
        fromDate: '2025-06-01',
        toDate: '2025-06-03',
        days: '3.00',
        status: 'approved',
      },
    ]);
  });
  afterAll(async () => {
    await ctx.drop();
  });

  it('computes quota/used/pending/available for the year', async () => {
    const b = await svc.balanceFor(empId, 2026, 'vacation');
    expect(b.quota).toBe(20);
    expect(b.used).toBe(5);
    expect(b.pending).toBe(3);
    expect(b.available).toBe(12);
  });

  it('all 6 leave types in summary list', async () => {
    const all = await svc.summary(empId, 2026);
    expect(all.length).toBe(6);
  });
});
```

- [ ] **Step 9.2: Run — fails**

Run: `pnpm --filter api test balanceService`
Expected: FAIL.

- [ ] **Step 9.3: Implement**

```ts
// apps/api/src/modules/absence/balanceService.ts
import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { leaveRequests } from '../../shared/db/schema.js';
import type { LeaveQuotaService } from './leaveQuotaService.js';
import type { LeaveTypeT } from '@naratala/shared';

const ALL_TYPES: LeaveTypeT[] = ['vacation', 'sick', 'personal', 'bereavement', 'parental', 'unpaid'];

interface Deps {
  db: DB;
  quotas: LeaveQuotaService;
}

export interface Balance {
  leaveType: LeaveTypeT;
  quota: number;
  used: number;
  pending: number;
  available: number;
}

export type BalanceService = ReturnType<typeof createBalanceService>;

export function createBalanceService(deps: Deps) {
  async function tally(employeeId: number, year: number): Promise<Map<LeaveTypeT, { used: number; pending: number }>> {
    const rows = await deps.db
      .select({
        leaveType: leaveRequests.leaveType,
        days: leaveRequests.days,
        status: leaveRequests.status,
      })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.employeeId, employeeId),
          gte(leaveRequests.fromDate, `${year}-01-01`),
          lte(leaveRequests.fromDate, `${year}-12-31`),
          inArray(leaveRequests.status, ['approved', 'pending']),
        ),
      );
    const m = new Map<LeaveTypeT, { used: number; pending: number }>();
    for (const r of rows) {
      const cur = m.get(r.leaveType) ?? { used: 0, pending: 0 };
      const d = Number(r.days);
      if (r.status === 'approved') cur.used += d;
      else cur.pending += d;
      m.set(r.leaveType, cur);
    }
    return m;
  }

  return {
    balanceFor: async (employeeId: number, year: number, leaveType: LeaveTypeT): Promise<Balance> => {
      const quota = await deps.quotas.quotaFor(employeeId, leaveType);
      const t = (await tally(employeeId, year)).get(leaveType) ?? { used: 0, pending: 0 };
      return {
        leaveType,
        quota,
        used: t.used,
        pending: t.pending,
        available: Math.max(0, quota - t.used - t.pending),
      };
    },
    summary: async (employeeId: number, year: number): Promise<Balance[]> => {
      const t = await tally(employeeId, year);
      const out: Balance[] = [];
      for (const lt of ALL_TYPES) {
        const quota = await deps.quotas.quotaFor(employeeId, lt);
        const v = t.get(lt) ?? { used: 0, pending: 0 };
        out.push({
          leaveType: lt,
          quota,
          used: v.used,
          pending: v.pending,
          available: Math.max(0, quota - v.used - v.pending),
        });
      }
      return out;
    },
  };
}
```

- [ ] **Step 9.4: Run — passes**

Run: `pnpm --filter api test balanceService`
Expected: PASS (2 tests).

- [ ] **Step 9.5: Commit**

```bash
git add apps/api/src/modules/absence/balanceService.ts apps/api/src/modules/absence/balanceService.test.ts
git commit -m "feat(absence): balance service (quota/used/pending/available)"
```

---

## Task 10: leaveRequestRepo + leaveRequestService (lifecycle)

**Files:**
- Create: `apps/api/src/modules/absence/leaveRequestRepo.ts`
- Create: `apps/api/src/modules/absence/leaveRequestService.ts`
- Create: `apps/api/src/modules/absence/leaveRequestService.test.ts`
- Modify: `apps/api/src/shared/mail/templates.ts` (3 new templates appended)

- [ ] **Step 10.1: Append mail templates**

In `apps/api/src/shared/mail/templates.ts`, append:

```ts
export function leaveRequestSubmittedEmail(args: {
  approverName: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: string;
}): { subject: string; html: string } {
  return {
    subject: `Time-off request: ${args.employeeName}`,
    html: `<p>${escape(args.employeeName)} requested ${escape(args.leaveType)} from ${escape(args.fromDate)} to ${escape(args.toDate)} (${escape(args.days)} days).</p><p>Please review in Naratala HRIS.</p>`,
  };
}

export function leaveRequestDecidedEmail(args: {
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  decision: 'approved' | 'declined';
  note?: string;
}): { subject: string; html: string } {
  return {
    subject: `Your time-off request was ${args.decision}`,
    html: `<p>Your ${escape(args.leaveType)} request (${escape(args.fromDate)} → ${escape(args.toDate)}) has been ${args.decision}.</p>${args.note ? `<p>Note: ${escape(args.note)}</p>` : ''}`,
  };
}

export function leaveRequestCancelledEmail(args: {
  approverName: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
}): { subject: string; html: string } {
  return {
    subject: `Time-off cancelled: ${args.employeeName}`,
    html: `<p>${escape(args.employeeName)} cancelled their ${escape(args.leaveType)} request (${escape(args.fromDate)} → ${escape(args.toDate)}).</p>`,
  };
}
```

- [ ] **Step 10.2: Write failing test (only the high-value cases)**

```ts
// apps/api/src/modules/absence/leaveRequestService.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createLeaveRequestRepo } from './leaveRequestRepo.js';
import { createLeaveRequestService } from './leaveRequestService.js';
import { createHolidayRepo } from './holidayRepo.js';
import { createHolidayService } from './holidayService.js';
import { createWorkingScheduleRepo } from './workingScheduleRepo.js';
import { createWorkingScheduleService } from './workingScheduleService.js';
import { createUserRepo } from '../auth/userRepo.js';
import { createEmployeeRepo } from '../employees/employeeRepo.js';
import { createAuditRepo } from '../audit/auditRepo.js';
import { departments, employees, users } from '../../shared/db/schema.js';
import { hashPassword } from '../auth/password.js';
import { ForbiddenError } from '../../shared/errors/index.js';

const noopMailer = { send: vi.fn(async () => {}) };

async function buildSvc(ctx: TestDb) {
  return createLeaveRequestService({
    db: ctx.db,
    requests: createLeaveRequestRepo(ctx.db),
    holidays: createHolidayService(createHolidayRepo(ctx.db)),
    schedule: createWorkingScheduleService(createWorkingScheduleRepo(ctx.db)),
    users: createUserRepo(ctx.db),
    employees: createEmployeeRepo(ctx.db),
    audit: createAuditRepo(ctx.db),
    mailer: noopMailer,
  });
}

describe('leaveRequestService', () => {
  let ctx: TestDb;
  let svc: Awaited<ReturnType<typeof buildSvc>>;
  let empUserId = 0;
  let empId = 0;
  let mgrUserId = 0;
  let mgrEmpId = 0;

  beforeAll(async () => {
    ctx = await createTestDb();
    const hash = await hashPassword('correct-horse-12');
    const [emp] = await ctx.db
      .insert(users)
      .values({ email: 'e@n.local', passwordHash: hash, role: 'employee', status: 'active' })
      .$returningId();
    empUserId = emp!.id;
    const [mgr] = await ctx.db
      .insert(users)
      .values({ email: 'm@n.local', passwordHash: hash, role: 'manager', status: 'active' })
      .$returningId();
    mgrUserId = mgr!.id;
    const [d] = await ctx.db.insert(departments).values({ name: 'D' }).$returningId();
    const [mgrEmp] = await ctx.db
      .insert(employees)
      .values({
        userId: mgrUserId,
        fullName: 'Mgr',
        email: 'mgr@n.local',
        departmentId: d!.id,
        position: 'M',
        employmentType: 'full_time',
        hireDate: '2024-01-01',
        avatarColorHue: 1,
      })
      .$returningId();
    mgrEmpId = mgrEmp!.id;
    const [e] = await ctx.db
      .insert(employees)
      .values({
        userId: empUserId,
        fullName: 'Emp',
        email: 'emp@n.local',
        departmentId: d!.id,
        managerId: mgrEmpId,
        position: 'P',
        employmentType: 'full_time',
        hireDate: '2024-01-01',
        avatarColorHue: 2,
      })
      .$returningId();
    empId = e!.id;
    svc = await buildSvc(ctx);
  });
  afterAll(async () => {
    await ctx.drop();
  });

  it('submit happy path: pending, days computed, mail sent', async () => {
    noopMailer.send.mockClear();
    const r = await svc.submit(
      { userId: empUserId, role: 'employee', employeeId: empId, ip: 'x' },
      { leaveType: 'vacation', fromDate: '2026-05-04', toDate: '2026-05-08' },
    );
    expect(r.status).toBe('pending');
    expect(r.days).toBe('5.00');
    expect(noopMailer.send).toHaveBeenCalled();
  });

  it('manager-on-behalf auto-approves', async () => {
    const r = await svc.submit(
      { userId: mgrUserId, role: 'manager', employeeId: mgrEmpId, ip: 'x' },
      { employeeId: empId, leaveType: 'sick', fromDate: '2026-06-01', toDate: '2026-06-01' },
    );
    expect(r.status).toBe('approved');
  });

  it('zero working days → 400 LEAVE_ZERO_DAYS', async () => {
    await expect(
      svc.submit(
        { userId: empUserId, role: 'employee', employeeId: empId, ip: 'x' },
        { leaveType: 'vacation', fromDate: '2026-05-09', toDate: '2026-05-10' },
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED', message: expect.stringMatching(/zero/i) });
  });

  it('cancel approved-future succeeds', async () => {
    const r = await svc.submit(
      { userId: mgrUserId, role: 'manager', employeeId: mgrEmpId, ip: 'x' },
      { employeeId: empId, leaveType: 'personal', fromDate: '2099-01-05', toDate: '2099-01-05' },
    );
    const cancelled = await svc.cancel(
      { userId: empUserId, role: 'employee', employeeId: empId, ip: 'x' },
      r.id,
    );
    expect(cancelled.status).toBe('cancelled');
  });

  it('cancel approved-past returns LEAVE_ALREADY_STARTED', async () => {
    const r = await svc.submit(
      { userId: mgrUserId, role: 'manager', employeeId: mgrEmpId, ip: 'x' },
      { employeeId: empId, leaveType: 'personal', fromDate: '2020-01-05', toDate: '2020-01-05' },
    );
    await expect(
      svc.cancel({ userId: empUserId, role: 'employee', employeeId: empId, ip: 'x' }, r.id),
    ).rejects.toMatchObject({ message: expect.stringMatching(/already started/i) });
  });

  it('manager cannot approve for non-report', async () => {
    const otherUser = (await ctx.db
      .insert(users)
      .values({ email: 'o@n.local', passwordHash: 'x', role: 'employee', status: 'active' })
      .$returningId())[0]!;
    const otherDept = (await ctx.db.insert(departments).values({ name: 'O' }).$returningId())[0]!;
    const otherEmp = (await ctx.db
      .insert(employees)
      .values({
        userId: otherUser.id,
        fullName: 'Other',
        email: 'other@n.local',
        departmentId: otherDept.id,
        position: 'P',
        employmentType: 'full_time',
        hireDate: '2024-01-01',
        avatarColorHue: 9,
      })
      .$returningId())[0]!;
    const r = await svc.submit(
      { userId: otherUser.id, role: 'employee', employeeId: otherEmp.id, ip: 'x' },
      { leaveType: 'vacation', fromDate: '2026-07-06', toDate: '2026-07-06' },
    );
    await expect(
      svc.approve({ userId: mgrUserId, role: 'manager', employeeId: mgrEmpId, ip: 'x' }, r.id, {}),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
```

- [ ] **Step 10.3: Run — fails**

Run: `pnpm --filter api test leaveRequestService`
Expected: FAIL.

- [ ] **Step 10.4: Implement repo**

```ts
// apps/api/src/modules/absence/leaveRequestRepo.ts
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { employees, leaveRequests } from '../../shared/db/schema.js';
import type { LeaveStatusT, LeaveTypeT } from '@naratala/shared';

export type LeaveRequestRow = typeof leaveRequests.$inferSelect;
export type LeaveRequestRepo = ReturnType<typeof createLeaveRequestRepo>;

interface ListFilters {
  employeeIds?: number[] | 'any';
  status?: LeaveStatusT;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export function createLeaveRequestRepo(db: DB) {
  return {
    insert: async (v: {
      employeeId: number;
      actorUserId: number;
      leaveType: LeaveTypeT;
      fromDate: string;
      toDate: string;
      days: string;
      reason?: string;
      status: LeaveStatusT;
      decidedByUserId?: number;
      decidedAt?: Date;
    }) => {
      const [r] = await db.insert(leaveRequests).values(v).$returningId();
      const [row] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, r!.id));
      return row!;
    },
    findById: async (id: number) => {
      const [r] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
      return r ?? null;
    },
    list: async (f: ListFilters) => {
      const where = [] as unknown[];
      if (f.employeeIds && f.employeeIds !== 'any') {
        if (f.employeeIds.length === 0) return { data: [], total: 0 };
        where.push(inArray(leaveRequests.employeeId, f.employeeIds));
      }
      if (f.status) where.push(eq(leaveRequests.status, f.status));
      if (f.from) where.push(gte(leaveRequests.fromDate, f.from));
      if (f.to) where.push(lte(leaveRequests.fromDate, f.to));
      const conds = where.length ? (and(...(where as any[])) as any) : undefined;
      const baseQ = conds ? db.select().from(leaveRequests).where(conds) : db.select().from(leaveRequests);
      const data = await baseQ
        .orderBy(desc(leaveRequests.fromDate), asc(leaveRequests.id))
        .limit(f.pageSize)
        .offset((f.page - 1) * f.pageSize);
      const [{ c }] = (await (conds
        ? db.select({ c: sql<number>`count(*)` }).from(leaveRequests).where(conds)
        : db.select({ c: sql<number>`count(*)` }).from(leaveRequests))) as { c: number }[];
      return { data, total: Number(c) };
    },
    update: async (id: number, patch: Partial<LeaveRequestRow>) => {
      await db.update(leaveRequests).set(patch).where(eq(leaveRequests.id, id));
      const [row] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
      return row!;
    },
    findManagedReportIds: async (managerEmployeeId: number) => {
      const rows = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.managerId, managerEmployeeId));
      return rows.map((r) => r.id);
    },
  };
}
```

- [ ] **Step 10.5: Implement service**

```ts
// apps/api/src/modules/absence/leaveRequestService.ts
import type { DB } from '../../shared/db/client.js';
import type { LeaveRequestRepo, LeaveRequestRow } from './leaveRequestRepo.js';
import type { HolidayService } from './holidayService.js';
import type { WorkingScheduleService } from './workingScheduleService.js';
import type { UserRepo } from '../auth/userRepo.js';
import type { EmployeeRepo } from '../employees/employeeRepo.js';
import type { AuditRepo } from '../audit/auditRepo.js';
import type { Mailer } from '../../shared/mail/mailer.js';
import { countDays } from './dayCounter.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors/index.js';
import {
  leaveRequestSubmittedEmail,
  leaveRequestDecidedEmail,
  leaveRequestCancelledEmail,
} from '../../shared/mail/templates.js';
import type { LeaveStatusT, LeaveTypeT, Role } from '@naratala/shared';
import { hasPermission } from '@naratala/shared';

interface Actor {
  userId: number;
  role: Role;
  employeeId: number | null;
  ip: string;
}

interface SubmitInput {
  employeeId?: number;
  leaveType: LeaveTypeT;
  fromDate: string;
  toDate: string;
  reason?: string;
}

interface Deps {
  db: DB;
  requests: LeaveRequestRepo;
  holidays: HolidayService;
  schedule: WorkingScheduleService;
  users: UserRepo;
  employees: EmployeeRepo;
  audit: AuditRepo;
  mailer: Mailer;
}

export type LeaveRequestService = ReturnType<typeof createLeaveRequestService>;

export function createLeaveRequestService(deps: Deps) {
  async function isReportOf(managerEmployeeId: number, targetEmployeeId: number) {
    const ids = await deps.requests.findManagedReportIds(managerEmployeeId);
    return ids.includes(targetEmployeeId);
  }

  async function notifyApprovers(employeeId: number, employeeName: string, body: ReturnType<typeof leaveRequestSubmittedEmail>) {
    const emp = await deps.employees.findById(employeeId);
    if (emp?.managerId) {
      const mgr = await deps.employees.findById(emp.managerId);
      if (mgr?.userId) {
        const mgrUser = await deps.users.findById(mgr.userId);
        if (mgrUser) await deps.mailer.send({ to: mgrUser.email, ...body });
        return;
      }
    }
    const hrs = await deps.users.listByRole('hr');
    await Promise.all(hrs.map((u) => deps.mailer.send({ to: u.email, ...body })));
  }

  return {
    submit: async (actor: Actor, input: SubmitInput): Promise<LeaveRequestRow> => {
      const targetEmployeeId = input.employeeId ?? actor.employeeId;
      if (!targetEmployeeId) throw new ValidationError('employeeId required');
      const onBehalf = targetEmployeeId !== actor.employeeId;
      if (onBehalf) {
        if (!hasPermission(actor.role, 'absence:write:any')) throw new ForbiddenError();
        if (actor.role === 'manager' && actor.employeeId !== null) {
          const ok = await isReportOf(actor.employeeId, targetEmployeeId);
          if (!ok) throw new ForbiddenError('OUT_OF_SCOPE');
        }
      }
      const wd = await deps.schedule.workingDaysFor(targetEmployeeId);
      const holidays = await deps.holidays.expandDates(input.fromDate, input.toDate);
      const days = countDays(input.fromDate, input.toDate, wd, holidays);
      if (days <= 0) throw new ValidationError('zero working days in range');
      const status: LeaveStatusT = onBehalf ? 'approved' : 'pending';
      const row = await deps.requests.insert({
        employeeId: targetEmployeeId,
        actorUserId: actor.userId,
        leaveType: input.leaveType,
        fromDate: input.fromDate,
        toDate: input.toDate,
        days: days.toFixed(2),
        ...(input.reason !== undefined ? { reason: input.reason } : {}),
        status,
        ...(onBehalf ? { decidedByUserId: actor.userId, decidedAt: new Date() } : {}),
      });
      await deps.audit.insert({
        actorUserId: actor.userId,
        actorIp: actor.ip,
        action: 'leave_request.submit',
        entityType: 'leave_request',
        entityId: row.id,
        changes: { after: { status, days: days.toFixed(2), leaveType: input.leaveType } },
      });
      const emp = await deps.employees.findById(targetEmployeeId);
      if (status === 'pending' && emp) {
        await notifyApprovers(
          targetEmployeeId,
          emp.fullName,
          leaveRequestSubmittedEmail({
            approverName: 'Approver',
            employeeName: emp.fullName,
            leaveType: input.leaveType,
            fromDate: input.fromDate,
            toDate: input.toDate,
            days: days.toFixed(2),
          }),
        );
      } else if (status === 'approved' && emp?.userId) {
        const u = await deps.users.findById(emp.userId);
        if (u) {
          await deps.mailer.send({
            to: u.email,
            ...leaveRequestDecidedEmail({
              employeeName: emp.fullName,
              leaveType: input.leaveType,
              fromDate: input.fromDate,
              toDate: input.toDate,
              decision: 'approved',
            }),
          });
        }
      }
      return row;
    },

    list: async (
      actor: Actor,
      f: { status?: LeaveStatusT; employeeId?: number; from?: string; to?: string; page: number; pageSize: number },
    ) => {
      let employeeIds: number[] | 'any';
      if (hasPermission(actor.role, 'absence:read:any')) {
        employeeIds = f.employeeId ? [f.employeeId] : 'any';
      } else if (hasPermission(actor.role, 'absence:read:reports') && actor.employeeId !== null) {
        const reports = await deps.requests.findManagedReportIds(actor.employeeId);
        const own = actor.employeeId;
        const allowed = new Set([own, ...reports]);
        employeeIds = f.employeeId
          ? allowed.has(f.employeeId)
            ? [f.employeeId]
            : []
          : Array.from(allowed);
      } else {
        if (actor.employeeId === null) return { data: [], total: 0, page: f.page, pageSize: f.pageSize };
        employeeIds = [actor.employeeId];
      }
      const out = await deps.requests.list({
        employeeIds,
        ...(f.status ? { status: f.status } : {}),
        ...(f.from ? { from: f.from } : {}),
        ...(f.to ? { to: f.to } : {}),
        page: f.page,
        pageSize: f.pageSize,
      });
      return { ...out, page: f.page, pageSize: f.pageSize };
    },

    detail: async (actor: Actor, id: number) => {
      const row = await deps.requests.findById(id);
      if (!row) throw new NotFoundError('leave request not found');
      const canRead =
        hasPermission(actor.role, 'absence:read:any') ||
        row.employeeId === actor.employeeId ||
        (hasPermission(actor.role, 'absence:read:reports') &&
          actor.employeeId !== null &&
          (await isReportOf(actor.employeeId, row.employeeId)));
      if (!canRead) throw new ForbiddenError();
      return row;
    },

    approve: async (actor: Actor, id: number, v: { note?: string }) => {
      const row = await deps.requests.findById(id);
      if (!row) throw new NotFoundError('leave request not found');
      if (row.status !== 'pending') throw new ValidationError('not pending');
      const allowed =
        hasPermission(actor.role, 'absence:approve:any') ||
        (hasPermission(actor.role, 'absence:approve:reports') &&
          actor.employeeId !== null &&
          (await isReportOf(actor.employeeId, row.employeeId)));
      if (!allowed) throw new ForbiddenError();
      const updated = await deps.requests.update(id, {
        status: 'approved',
        decidedByUserId: actor.userId,
        decidedAt: new Date(),
        ...(v.note !== undefined ? { decisionNote: v.note } : {}),
      });
      await deps.audit.insert({
        actorUserId: actor.userId,
        actorIp: actor.ip,
        action: 'leave_request.approve',
        entityType: 'leave_request',
        entityId: id,
        changes: { before: { status: 'pending' }, after: { status: 'approved' } },
      });
      const emp = await deps.employees.findById(row.employeeId);
      if (emp?.userId) {
        const u = await deps.users.findById(emp.userId);
        if (u) {
          await deps.mailer.send({
            to: u.email,
            ...leaveRequestDecidedEmail({
              employeeName: emp.fullName,
              leaveType: row.leaveType,
              fromDate: row.fromDate,
              toDate: row.toDate,
              decision: 'approved',
              ...(v.note !== undefined ? { note: v.note } : {}),
            }),
          });
        }
      }
      return updated;
    },

    decline: async (actor: Actor, id: number, v: { note?: string }) => {
      const row = await deps.requests.findById(id);
      if (!row) throw new NotFoundError('leave request not found');
      if (row.status !== 'pending') throw new ValidationError('not pending');
      const allowed =
        hasPermission(actor.role, 'absence:approve:any') ||
        (hasPermission(actor.role, 'absence:approve:reports') &&
          actor.employeeId !== null &&
          (await isReportOf(actor.employeeId, row.employeeId)));
      if (!allowed) throw new ForbiddenError();
      const updated = await deps.requests.update(id, {
        status: 'declined',
        decidedByUserId: actor.userId,
        decidedAt: new Date(),
        ...(v.note !== undefined ? { decisionNote: v.note } : {}),
      });
      await deps.audit.insert({
        actorUserId: actor.userId,
        actorIp: actor.ip,
        action: 'leave_request.decline',
        entityType: 'leave_request',
        entityId: id,
        changes: { before: { status: 'pending' }, after: { status: 'declined' } },
      });
      const emp = await deps.employees.findById(row.employeeId);
      if (emp?.userId) {
        const u = await deps.users.findById(emp.userId);
        if (u) {
          await deps.mailer.send({
            to: u.email,
            ...leaveRequestDecidedEmail({
              employeeName: emp.fullName,
              leaveType: row.leaveType,
              fromDate: row.fromDate,
              toDate: row.toDate,
              decision: 'declined',
              ...(v.note !== undefined ? { note: v.note } : {}),
            }),
          });
        }
      }
      return updated;
    },

    cancel: async (actor: Actor, id: number) => {
      const row = await deps.requests.findById(id);
      if (!row) throw new NotFoundError('leave request not found');
      const isOwner = row.employeeId === actor.employeeId;
      const canManage =
        hasPermission(actor.role, 'absence:approve:any') ||
        (hasPermission(actor.role, 'absence:approve:reports') &&
          actor.employeeId !== null &&
          (await isReportOf(actor.employeeId, row.employeeId)));
      if (!isOwner && !canManage) throw new ForbiddenError();
      if (row.status === 'cancelled' || row.status === 'declined') {
        throw new ValidationError('not cancellable');
      }
      if (row.status === 'approved') {
        const today = new Date().toISOString().slice(0, 10);
        if (row.fromDate <= today) throw new ValidationError('LEAVE_ALREADY_STARTED: already started');
      }
      const updated = await deps.requests.update(id, {
        status: 'cancelled',
        cancelledByUserId: actor.userId,
        cancelledAt: new Date(),
      });
      await deps.audit.insert({
        actorUserId: actor.userId,
        actorIp: actor.ip,
        action: 'leave_request.cancel',
        entityType: 'leave_request',
        entityId: id,
        changes: { before: { status: row.status }, after: { status: 'cancelled' } },
      });
      const emp = await deps.employees.findById(row.employeeId);
      if (emp?.managerId) {
        const mgr = await deps.employees.findById(emp.managerId);
        if (mgr?.userId) {
          const mgrUser = await deps.users.findById(mgr.userId);
          if (mgrUser) {
            await deps.mailer.send({
              to: mgrUser.email,
              ...leaveRequestCancelledEmail({
                approverName: mgr.fullName,
                employeeName: emp.fullName,
                leaveType: row.leaveType,
                fromDate: row.fromDate,
                toDate: row.toDate,
              }),
            });
          }
        }
      }
      return updated;
    },
  };
}
```

> Note: `userRepo.listByRole` may not exist in Phase 1. If not, add it as a small helper:
> ```ts
> // apps/api/src/modules/auth/userRepo.ts — append inside createUserRepo's return
> listByRole: (role: Role) => db.select().from(users).where(eq(users.role, role)),
> ```

- [ ] **Step 10.6: Run — passes**

Run: `pnpm --filter api test leaveRequestService`
Expected: PASS (6 tests).

- [ ] **Step 10.7: Commit**

```bash
git add apps/api/src/modules/absence/leaveRequestRepo.ts apps/api/src/modules/absence/leaveRequestService.ts apps/api/src/modules/absence/leaveRequestService.test.ts apps/api/src/shared/mail/templates.ts apps/api/src/modules/auth/userRepo.ts
git commit -m "feat(absence): leave request lifecycle (submit/approve/decline/cancel)"
```

---

## Task 11: HTTP routes + wire-up

**Files:**
- Create: `apps/api/src/modules/absence/leaveRequestRoutes.ts`
- Create: `apps/api/src/modules/absence/holidayRoutes.ts`
- Create: `apps/api/src/modules/absence/leavePolicyRoutes.ts`
- Create: `apps/api/src/modules/absence/workingScheduleRoutes.ts`
- Modify: `apps/api/src/bootstrap/wireApp.ts`
- Modify: `apps/api/src/test/permissionMatrix.test.ts`

- [ ] **Step 11.1: Create `leaveRequestRoutes.ts`**

```ts
// apps/api/src/modules/absence/leaveRequestRoutes.ts
import { Router } from 'express';
import { z } from 'zod';
import { LeaveRequestCreate, LeaveDecisionBody } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { LeaveRequestService } from './leaveRequestService.js';
import type { BalanceService } from './balanceService.js';
import type { JwtService } from '../auth/jwt.js';
import type { EmployeeRepo } from '../employees/employeeRepo.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const ListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['pending', 'approved', 'declined', 'cancelled']).optional(),
  employeeId: z.coerce.number().int().positive().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
const BalanceQuery = z.object({
  employeeId: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().min(2020).max(2100).default(new Date().getUTCFullYear()),
});

export function createLeaveRequestRouter(deps: {
  service: LeaveRequestService;
  balances: BalanceService;
  employees: EmployeeRepo;
  jwt: JwtService;
}): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

  async function actorOf(req: Express.Request) {
    const userId = req.user!.sub;
    const role = req.user!.role;
    const emp = await deps.employees.findByUserId(userId);
    return { userId, role, employeeId: emp?.id ?? null, ip: req.ip ?? 'unknown' };
  }

  r.get(
    '/',
    authenticate,
    authorize('absence:read:self'),
    validate({ query: ListQuery }),
    async (req, res, next) => {
      try {
        const actor = await actorOf(req);
        const q = req.valid.query as z.infer<typeof ListQuery>;
        res.json(await deps.service.list(actor, q));
      } catch (e) {
        next(e);
      }
    },
  );

  r.get(
    '/balances',
    authenticate,
    authorize('absence:read:self'),
    validate({ query: BalanceQuery }),
    async (req, res, next) => {
      try {
        const actor = await actorOf(req);
        const q = req.valid.query as z.infer<typeof BalanceQuery>;
        const target = q.employeeId ?? actor.employeeId;
        if (!target) return res.json({ data: [] });
        if (q.employeeId && q.employeeId !== actor.employeeId) {
          // permission already enforced via service-level access for detail; for balances we just check read perms
        }
        res.json({ data: await deps.balances.summary(target, q.year) });
      } catch (e) {
        next(e);
      }
    },
  );

  r.get(
    '/:id',
    authenticate,
    authorize('absence:read:self'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        const actor = await actorOf(req);
        const id = (req.valid.params as { id: number }).id;
        res.json(await deps.service.detail(actor, id));
      } catch (e) {
        next(e);
      }
    },
  );

  r.post(
    '/',
    authenticate,
    authorize('absence:write:self'),
    validate({ body: LeaveRequestCreate }),
    async (req, res, next) => {
      try {
        const actor = await actorOf(req);
        const body = req.valid.body as z.infer<typeof LeaveRequestCreate>;
        res.status(201).json(await deps.service.submit(actor, body));
      } catch (e) {
        next(e);
      }
    },
  );

  r.post(
    '/:id/approve',
    authenticate,
    authorize('absence:approve:reports'),
    validate({ params: IdParam, body: LeaveDecisionBody }),
    async (req, res, next) => {
      try {
        const actor = await actorOf(req);
        const id = (req.valid.params as { id: number }).id;
        const body = req.valid.body as { note?: string };
        res.json(await deps.service.approve(actor, id, body));
      } catch (e) {
        next(e);
      }
    },
  );

  r.post(
    '/:id/decline',
    authenticate,
    authorize('absence:approve:reports'),
    validate({ params: IdParam, body: LeaveDecisionBody }),
    async (req, res, next) => {
      try {
        const actor = await actorOf(req);
        const id = (req.valid.params as { id: number }).id;
        const body = req.valid.body as { note?: string };
        res.json(await deps.service.decline(actor, id, body));
      } catch (e) {
        next(e);
      }
    },
  );

  r.post(
    '/:id/cancel',
    authenticate,
    authorize('absence:read:self'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        const actor = await actorOf(req);
        const id = (req.valid.params as { id: number }).id;
        res.json(await deps.service.cancel(actor, id));
      } catch (e) {
        next(e);
      }
    },
  );

  return r;
}
```

> Note: ensure `EmployeeRepo` exposes `findByUserId(id)`. If absent, add it: `findByUserId: async (userId: number) => { const [r] = await db.select().from(employees).where(eq(employees.userId, userId)); return r ?? null; }`.

- [ ] **Step 11.2: Create `holidayRoutes.ts`**

```ts
// apps/api/src/modules/absence/holidayRoutes.ts
import { Router } from 'express';
import { z } from 'zod';
import { HolidayCreate, HolidayUpdate } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { HolidayService } from './holidayService.js';
import type { JwtService } from '../auth/jwt.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const YearQuery = z.object({ year: z.coerce.number().int().min(2020).max(2100).default(new Date().getUTCFullYear()) });

export function createHolidayRouter(deps: { service: HolidayService; jwt: JwtService }): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);
  r.get('/', authenticate, validate({ query: YearQuery }), async (req, res, next) => {
    try {
      res.json({ data: await deps.service.list((req.valid.query as { year: number }).year) });
    } catch (e) {
      next(e);
    }
  });
  r.post('/', authenticate, authorize('absence:configure'), validate({ body: HolidayCreate }), async (req, res, next) => {
    try {
      res.status(201).json(await deps.service.create(req.valid.body as z.infer<typeof HolidayCreate>));
    } catch (e) {
      next(e);
    }
  });
  r.patch(
    '/:id',
    authenticate,
    authorize('absence:configure'),
    validate({ params: IdParam, body: HolidayUpdate }),
    async (req, res, next) => {
      try {
        const id = (req.valid.params as { id: number }).id;
        res.json(await deps.service.update(id, req.valid.body as Record<string, unknown>));
      } catch (e) {
        next(e);
      }
    },
  );
  r.delete('/:id', authenticate, authorize('absence:configure'), validate({ params: IdParam }), async (req, res, next) => {
    try {
      const id = (req.valid.params as { id: number }).id;
      await deps.service.remove(id);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
  return r;
}
```

- [ ] **Step 11.3: Create `leavePolicyRoutes.ts`**

```ts
// apps/api/src/modules/absence/leavePolicyRoutes.ts
import { Router } from 'express';
import { z } from 'zod';
import { LeavePolicyUpdate } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { LeavePolicyService } from './leavePolicyService.js';
import type { JwtService } from '../auth/jwt.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });

export function createLeavePolicyRouter(deps: { service: LeavePolicyService; jwt: JwtService }): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);
  r.get('/', authenticate, async (_req, res, next) => {
    try {
      res.json({ data: await deps.service.list() });
    } catch (e) {
      next(e);
    }
  });
  r.patch(
    '/:id',
    authenticate,
    authorize('absence:configure'),
    validate({ params: IdParam, body: LeavePolicyUpdate }),
    async (req, res, next) => {
      try {
        const id = (req.valid.params as { id: number }).id;
        res.json(await deps.service.update(id, req.valid.body as z.infer<typeof LeavePolicyUpdate>));
      } catch (e) {
        next(e);
      }
    },
  );
  return r;
}
```

- [ ] **Step 11.4: Create `workingScheduleRoutes.ts`**

```ts
// apps/api/src/modules/absence/workingScheduleRoutes.ts
import { Router } from 'express';
import { z } from 'zod';
import { WorkingScheduleUpdate, LeaveQuotaUpsert, LeaveType } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { WorkingScheduleService } from './workingScheduleService.js';
import type { LeaveQuotaService } from './leaveQuotaService.js';
import type { JwtService } from '../auth/jwt.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const QuotaParams = z.object({
  id: z.coerce.number().int().positive(),
  leaveType: LeaveType,
});
const DefaultBody = z.object({ workingDays: z.number().int().min(0).max(127) }).strict();

export function createWorkingScheduleRouter(deps: {
  schedule: WorkingScheduleService;
  quotas: LeaveQuotaService;
  jwt: JwtService;
}): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

  r.get('/', authenticate, authorize('absence:configure'), async (_req, res, next) => {
    try {
      res.json(await deps.schedule.snapshot());
    } catch (e) {
      next(e);
    }
  });
  r.patch('/default', authenticate, authorize('absence:configure'), validate({ body: DefaultBody }), async (req, res, next) => {
    try {
      const body = req.valid.body as z.infer<typeof DefaultBody>;
      await deps.schedule.updateDefault(body.workingDays);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
  r.patch(
    '/employees/:id',
    authenticate,
    authorize('absence:configure'),
    validate({ params: IdParam, body: WorkingScheduleUpdate }),
    async (req, res, next) => {
      try {
        const id = (req.valid.params as { id: number }).id;
        const body = req.valid.body as z.infer<typeof WorkingScheduleUpdate>;
        await deps.schedule.setEmployeeOverride(id, body.workingDays);
        res.json({ ok: true });
      } catch (e) {
        next(e);
      }
    },
  );

  r.get('/employees/:id/quotas', authenticate, authorize('absence:configure'), validate({ params: IdParam }), async (req, res, next) => {
    try {
      const id = (req.valid.params as { id: number }).id;
      res.json({ data: await deps.quotas.listForEmployee(id) });
    } catch (e) {
      next(e);
    }
  });
  r.put(
    '/employees/:id/quotas/:leaveType',
    authenticate,
    authorize('absence:configure'),
    validate({ params: QuotaParams, body: LeaveQuotaUpsert }),
    async (req, res, next) => {
      try {
        const p = req.valid.params as z.infer<typeof QuotaParams>;
        const body = req.valid.body as z.infer<typeof LeaveQuotaUpsert>;
        res.json(await deps.quotas.upsertOverride(p.id, p.leaveType, body.daysPerYear));
      } catch (e) {
        next(e);
      }
    },
  );
  r.delete(
    '/employees/:id/quotas/:leaveType',
    authenticate,
    authorize('absence:configure'),
    validate({ params: QuotaParams }),
    async (req, res, next) => {
      try {
        const p = req.valid.params as z.infer<typeof QuotaParams>;
        await deps.quotas.removeOverride(p.id, p.leaveType);
        res.json({ ok: true });
      } catch (e) {
        next(e);
      }
    },
  );

  return r;
}
```

- [ ] **Step 11.5: Wire routes in `wireApp.ts`**

In `apps/api/src/bootstrap/wireApp.ts`, add imports + service constructions + `app.use(...)` lines:

```ts
import { createDayCounter as _ /* not needed */ } from '../modules/absence/dayCounter.js';
import { createHolidayRepo } from '../modules/absence/holidayRepo.js';
import { createHolidayService } from '../modules/absence/holidayService.js';
import { createLeavePolicyRepo } from '../modules/absence/leavePolicyRepo.js';
import { createLeavePolicyService } from '../modules/absence/leavePolicyService.js';
import { createWorkingScheduleRepo } from '../modules/absence/workingScheduleRepo.js';
import { createWorkingScheduleService } from '../modules/absence/workingScheduleService.js';
import { createLeaveQuotaRepo } from '../modules/absence/leaveQuotaRepo.js';
import { createLeaveQuotaService } from '../modules/absence/leaveQuotaService.js';
import { createBalanceService } from '../modules/absence/balanceService.js';
import { createLeaveRequestRepo } from '../modules/absence/leaveRequestRepo.js';
import { createLeaveRequestService } from '../modules/absence/leaveRequestService.js';
import { createLeaveRequestRouter } from '../modules/absence/leaveRequestRoutes.js';
import { createHolidayRouter } from '../modules/absence/holidayRoutes.js';
import { createLeavePolicyRouter } from '../modules/absence/leavePolicyRoutes.js';
import { createWorkingScheduleRouter } from '../modules/absence/workingScheduleRoutes.js';
```

(Remove the unused import line `import { createDayCounter as _ }` — only the others are real.)

Inside `wireRoutes`, after the existing `empSvc = …` block:

```ts
  const holidaySvc = createHolidayService(createHolidayRepo(db));
  const policySvc = createLeavePolicyService(createLeavePolicyRepo(db));
  const scheduleSvc = createWorkingScheduleService(createWorkingScheduleRepo(db));
  const quotaSvc = createLeaveQuotaService({
    quotas: createLeaveQuotaRepo(db),
    policies: createLeavePolicyRepo(db),
  });
  const balanceSvc = createBalanceService({ db, quotas: quotaSvc });
  const empRepo = createEmployeeRepo(db);
  const requestSvc = createLeaveRequestService({
    db,
    requests: createLeaveRequestRepo(db),
    holidays: holidaySvc,
    schedule: scheduleSvc,
    users: userRepo,
    employees: empRepo,
    audit: auditRepo,
    mailer,
  });
```

Then below the existing `app.use('/api/audit', …)`:

```ts
  app.use('/api/absence/requests', createLeaveRequestRouter({ service: requestSvc, balances: balanceSvc, employees: empRepo, jwt }));
  app.use('/api/holidays', createHolidayRouter({ service: holidaySvc, jwt }));
  app.use('/api/leave-policies', createLeavePolicyRouter({ service: policySvc, jwt }));
  app.use('/api/working-schedule', createWorkingScheduleRouter({ schedule: scheduleSvc, quotas: quotaSvc, jwt }));
```

- [ ] **Step 11.6: Extend `permissionMatrix.test.ts`**

Add cases inside `buildCases()`:

```ts
      { method: 'GET', path: '/api/absence/requests', role: 'employee', expect: 'allow' },
      { method: 'GET', path: '/api/absence/balances', role: 'employee', expect: 'allow' },
      { method: 'GET', path: '/api/holidays', role: 'employee', expect: 'allow' },
      { method: 'POST', path: '/api/holidays', role: 'employee', expect: 'forbid', body: { date: '2026-12-25', label: 'X' } },
      { method: 'POST', path: '/api/holidays', role: 'manager', expect: 'forbid', body: { date: '2026-12-25', label: 'X' } },
      { method: 'POST', path: '/api/holidays', role: 'hr', expect: 'allow', body: { date: '2026-12-25', label: 'X' } },
      { method: 'PATCH', path: '/api/working-schedule/default', role: 'manager', expect: 'forbid', body: { workingDays: 62 } },
      { method: 'PATCH', path: '/api/working-schedule/default', role: 'admin', expect: 'allow', body: { workingDays: 62 } },
```

- [ ] **Step 11.7: Run all api tests**

Run: `pnpm --filter api test`
Expected: all green.

- [ ] **Step 11.8: Commit**

```bash
git add apps/api/src/modules/absence/leaveRequestRoutes.ts apps/api/src/modules/absence/holidayRoutes.ts apps/api/src/modules/absence/leavePolicyRoutes.ts apps/api/src/modules/absence/workingScheduleRoutes.ts apps/api/src/bootstrap/wireApp.ts apps/api/src/test/permissionMatrix.test.ts
git commit -m "feat(absence): HTTP routes wired into app + permission matrix"
```

---

## Task 12: Frontend hooks + qk extension

**Files:**
- Modify: `apps/web/src/shared/api/queries.ts`
- Create: `apps/web/src/features/absence/hooks.ts`
- Modify: `apps/web/src/test/handlers.ts` (default absence handlers)
- Modify: `apps/web/src/test/fixtures.ts` (sample request + balances)

- [ ] **Step 12.1: Extend `qk`**

In `apps/web/src/shared/api/queries.ts`, inside the `qk` object, add:

```ts
  absence: {
    list: (filters: Record<string, unknown>) => ['absence', 'list', filters] as const,
    detail: (id: number) => ['absence', 'detail', id] as const,
    balances: (employeeId: number | 'self', year: number) =>
      ['absence', 'balances', employeeId, year] as const,
    holidays: (year: number) => ['absence', 'holidays', year] as const,
    policies: () => ['absence', 'policies'] as const,
    schedule: () => ['absence', 'schedule'] as const,
  },
```

- [ ] **Step 12.2: Add fixtures**

In `apps/web/src/test/fixtures.ts`, append:

```ts
import type { LeaveRequestDTO, BalanceDTO, HolidayDTO, LeavePolicyDTO } from '@naratala/shared';

export const sampleRequest: LeaveRequestDTO = {
  id: 1,
  employeeId: sampleEmployee.id,
  employeeName: sampleEmployee.fullName,
  actorUserId: 1,
  leaveType: 'vacation',
  fromDate: '2026-06-01',
  toDate: '2026-06-05',
  days: '5.00',
  reason: 'family trip',
  status: 'pending',
  decidedByUserId: null,
  decidedAt: null,
  decisionNote: null,
  cancelledByUserId: null,
  cancelledAt: null,
  createdAt: '2026-05-08T00:00:00.000Z',
  updatedAt: '2026-05-08T00:00:00.000Z',
};

export const sampleBalances: BalanceDTO[] = [
  { leaveType: 'vacation', quota: '20.00', used: '3.00', pending: '5.00', available: '12.00' },
  { leaveType: 'sick', quota: '10.00', used: '0.00', pending: '0.00', available: '10.00' },
  { leaveType: 'personal', quota: '5.00', used: '0.00', pending: '0.00', available: '5.00' },
  { leaveType: 'bereavement', quota: '3.00', used: '0.00', pending: '0.00', available: '3.00' },
  { leaveType: 'parental', quota: '90.00', used: '0.00', pending: '0.00', available: '90.00' },
  { leaveType: 'unpaid', quota: '0.00', used: '0.00', pending: '0.00', available: '0.00' },
];

export const sampleHoliday: HolidayDTO = {
  id: 1,
  date: '2026-05-01',
  label: 'Labor Day',
  recurringAnnually: true,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

export const samplePolicies: LeavePolicyDTO[] = [
  { id: 1, leaveType: 'vacation', defaultDaysPerYear: '20.00', isPaid: true, affectsBalance: true },
  { id: 2, leaveType: 'sick', defaultDaysPerYear: '10.00', isPaid: true, affectsBalance: true },
  { id: 3, leaveType: 'personal', defaultDaysPerYear: '5.00', isPaid: true, affectsBalance: true },
  { id: 4, leaveType: 'bereavement', defaultDaysPerYear: '3.00', isPaid: true, affectsBalance: true },
  { id: 5, leaveType: 'parental', defaultDaysPerYear: '90.00', isPaid: true, affectsBalance: true },
  { id: 6, leaveType: 'unpaid', defaultDaysPerYear: '0.00', isPaid: false, affectsBalance: false },
];
```

- [ ] **Step 12.3: Extend default handlers**

In `apps/web/src/test/handlers.ts`, append (inside the array):

```ts
  http.get('/api/absence/requests', () =>
    HttpResponse.json({ data: [sampleRequest], page: 1, pageSize: 25, total: 1 }),
  ),
  http.get('/api/absence/balances', () => HttpResponse.json({ data: sampleBalances })),
  http.get('/api/holidays', () => HttpResponse.json({ data: [sampleHoliday] })),
  http.get('/api/leave-policies', () => HttpResponse.json({ data: samplePolicies })),
  http.get('/api/working-schedule', () =>
    HttpResponse.json({ defaultWorkingDays: 62, perEmployeeOverrides: [] }),
  ),
```

Add the import line at the top:
```ts
import { sampleRequest, sampleBalances, sampleHoliday, samplePolicies } from './fixtures.js';
```

- [ ] **Step 12.4: Create `hooks.ts`**

```ts
// apps/web/src/features/absence/hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  LeaveRequestDTO,
  BalanceDTO,
  HolidayDTO,
  LeavePolicyDTO,
  LeaveTypeT,
} from '@naratala/shared';
import { apiFetch } from '../../shared/api/client.js';
import { qk } from '../../shared/api/queries.js';

export interface RequestFilters {
  status?: 'pending' | 'approved' | 'declined' | 'cancelled';
  employeeId?: number;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

function qs(filters: Record<string, unknown>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  return p.toString();
}

export function useLeaveRequestsQuery(filters: RequestFilters) {
  const s = qs(filters as Record<string, unknown>);
  return useQuery({
    queryKey: qk.absence.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiFetch<{ data: LeaveRequestDTO[]; page: number; pageSize: number; total: number }>(
        `/api/absence/requests${s ? `?${s}` : ''}`,
      ),
  });
}

export function useBalancesQuery(employeeId: number | null, year: number) {
  return useQuery({
    queryKey: qk.absence.balances(employeeId ?? 'self', year),
    queryFn: () =>
      apiFetch<{ data: BalanceDTO[] }>(
        `/api/absence/balances?${qs({ employeeId: employeeId ?? undefined, year })}`,
      ),
  });
}

export function useSubmitRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { leaveType: LeaveTypeT; fromDate: string; toDate: string; reason?: string; employeeId?: number }) =>
      apiFetch<LeaveRequestDTO>('/api/absence/requests', { method: 'POST', body: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['absence', 'list'] });
      qc.invalidateQueries({ queryKey: ['absence', 'balances'] });
    },
  });
}

export function useDecideRequest(action: 'approve' | 'decline') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; note?: string }) =>
      apiFetch<LeaveRequestDTO>(`/api/absence/requests/${v.id}/${action}`, {
        method: 'POST',
        body: { note: v.note },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['absence', 'list'] });
      qc.invalidateQueries({ queryKey: ['absence', 'balances'] });
      qc.invalidateQueries({ queryKey: ['audit', 'list'] });
    },
  });
}

export function useCancelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<LeaveRequestDTO>(`/api/absence/requests/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['absence', 'list'] });
      qc.invalidateQueries({ queryKey: ['absence', 'balances'] });
    },
  });
}

export function useHolidaysQuery(year: number) {
  return useQuery({
    queryKey: qk.absence.holidays(year),
    queryFn: () => apiFetch<{ data: HolidayDTO[] }>(`/api/holidays?year=${year}`),
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { date: string; label: string; recurringAnnually?: boolean }) =>
      apiFetch<HolidayDTO>('/api/holidays', { method: 'POST', body: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['absence', 'holidays'] }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/holidays/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['absence', 'holidays'] }),
  });
}

export function useLeavePoliciesQuery() {
  return useQuery({
    queryKey: qk.absence.policies(),
    queryFn: () => apiFetch<{ data: LeavePolicyDTO[] }>('/api/leave-policies'),
  });
}

export function useUpdateLeavePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; defaultDaysPerYear?: number; isPaid?: boolean; affectsBalance?: boolean }) =>
      apiFetch<LeavePolicyDTO>(`/api/leave-policies/${v.id}`, {
        method: 'PATCH',
        body: { defaultDaysPerYear: v.defaultDaysPerYear, isPaid: v.isPaid, affectsBalance: v.affectsBalance },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['absence', 'policies'] }),
  });
}

export function useScheduleQuery() {
  return useQuery({
    queryKey: qk.absence.schedule(),
    queryFn: () =>
      apiFetch<{
        defaultWorkingDays: number;
        perEmployeeOverrides: Array<{ employeeId: number; workingDays: number }>;
      }>('/api/working-schedule'),
  });
}

export function useUpdateDefaultSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workingDays: number) =>
      apiFetch('/api/working-schedule/default', { method: 'PATCH', body: { workingDays } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['absence', 'schedule'] }),
  });
}
```

- [ ] **Step 12.5: Commit**

```bash
git add apps/web/src/shared/api/queries.ts apps/web/src/features/absence/hooks.ts apps/web/src/test/fixtures.ts apps/web/src/test/handlers.ts
git commit -m "feat(web): absence hooks + qk extension + msw fixtures"
```

---

## Task 13: NewRequestModal

**Files:**
- Create: `apps/web/src/features/absence/NewRequestModal.tsx`
- Create: `apps/web/src/features/absence/NewRequestModal.test.tsx`

- [ ] **Step 13.1: Write failing test**

```tsx
// apps/web/src/features/absence/NewRequestModal.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { NewRequestModal } from './NewRequestModal.js';
import { sampleRequest } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('NewRequestModal', () => {
  it('submits and closes on success', async () => {
    let seen: { leaveType?: string; fromDate?: string; toDate?: string } | null = null;
    server.use(
      http.post('/api/absence/requests', async ({ request }) => {
        seen = (await request.json()) as { leaveType?: string; fromDate?: string; toDate?: string };
        return HttpResponse.json({ ...sampleRequest, ...seen }, { status: 201 });
      }),
    );
    let closed = false;
    renderWithProviders(<NewRequestModal onClose={() => (closed = true)} />);
    await userEvent.selectOptions(screen.getByLabelText(/leave type/i), 'vacation');
    await userEvent.type(screen.getByLabelText(/from/i), '2026-06-01');
    await userEvent.type(screen.getByLabelText(/to/i), '2026-06-05');
    await userEvent.type(screen.getByLabelText(/reason/i), 'trip');
    await userEvent.click(screen.getByRole('button', { name: /submit|kirim/i }));
    await waitFor(() => expect(closed).toBe(true));
    expect(seen!.leaveType).toBe('vacation');
  });

  it('shows server validation error (zero days)', async () => {
    server.use(
      http.post('/api/absence/requests', () =>
        HttpResponse.json(
          { code: 'VALIDATION_FAILED', message: 'zero working days in range' },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<NewRequestModal onClose={() => {}} />);
    await userEvent.selectOptions(screen.getByLabelText(/leave type/i), 'vacation');
    await userEvent.type(screen.getByLabelText(/from/i), '2026-06-06');
    await userEvent.type(screen.getByLabelText(/to/i), '2026-06-07');
    await userEvent.click(screen.getByRole('button', { name: /submit|kirim/i }));
    await waitFor(() => expect(screen.getByText(/zero working days/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 13.2: Run — fails**

Run: `pnpm --filter web test NewRequestModal`
Expected: FAIL.

- [ ] **Step 13.3: Implement**

```tsx
// apps/web/src/features/absence/NewRequestModal.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LeaveRequestCreate, type LeaveTypeT } from '@naratala/shared';
import { useSubmitRequest } from './hooks.js';
import { ApiError } from '../../shared/api/ApiError.js';
import { useState } from 'react';

type Input = { leaveType: LeaveTypeT; fromDate: string; toDate: string; reason?: string };

export function NewRequestModal({ onClose }: { onClose: () => void }): JSX.Element {
  const m = useSubmitRequest();
  const [serverErr, setServerErr] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Input>({
    resolver: zodResolver(LeaveRequestCreate),
    defaultValues: { leaveType: 'vacation', fromDate: '', toDate: '', reason: '' },
  });
  return (
    <div role="dialog" aria-label="new request" className="nt-modal">
      <h3>Request time off</h3>
      <form
        onSubmit={handleSubmit((v) =>
          m.mutate(v, {
            onSuccess: () => onClose(),
            onError: (e) => setServerErr(e instanceof ApiError ? e.message : 'Submit failed'),
          }),
        )}
      >
        <label>
          Leave type
          <select {...register('leaveType')}>
            <option value="vacation">Vacation</option>
            <option value="sick">Sick</option>
            <option value="personal">Personal</option>
            <option value="bereavement">Bereavement</option>
            <option value="parental">Parental</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </label>
        <label>
          From
          <input type="date" {...register('fromDate')} />
        </label>
        {formState.errors.fromDate && <p role="alert">{formState.errors.fromDate.message}</p>}
        <label>
          To
          <input type="date" {...register('toDate')} />
        </label>
        {formState.errors.toDate && <p role="alert">{formState.errors.toDate.message}</p>}
        <label>
          Reason
          <textarea {...register('reason')} />
        </label>
        {serverErr && <p role="alert">{serverErr}</p>}
        <div>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={m.isPending}>
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 13.4: Run — passes**

Run: `pnpm --filter web test NewRequestModal`
Expected: PASS (2 tests).

- [ ] **Step 13.5: Commit**

```bash
git add apps/web/src/features/absence/NewRequestModal.tsx apps/web/src/features/absence/NewRequestModal.test.tsx
git commit -m "feat(web): NewRequestModal (RHF + zodResolver against LeaveRequestCreate)"
```

---

## Task 14: BalanceBar + MyAbsencePage

**Files:**
- Create: `apps/web/src/features/absence/BalanceBar.tsx`
- Create: `apps/web/src/features/absence/MyAbsencePage.tsx`
- Create: `apps/web/src/features/absence/MyAbsencePage.test.tsx`

- [ ] **Step 14.1: Implement `BalanceBar.tsx`**

```tsx
// apps/web/src/features/absence/BalanceBar.tsx
import type { BalanceDTO } from '@naratala/shared';

export function BalanceBar({ b }: { b: BalanceDTO }): JSX.Element {
  const quota = Number(b.quota);
  const used = Number(b.used);
  const pending = Number(b.pending);
  const usedPct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  const pendingPct = quota > 0 ? Math.min(100 - usedPct, (pending / quota) * 100) : 0;
  return (
    <div className="nt-balance" data-leave-type={b.leaveType}>
      <div className="nt-balance-top">
        <span>{b.leaveType}</span>
        <span className="nt-balance-num">
          {used}+{pending}<span className="muted">/{quota}</span>
        </span>
      </div>
      <div className="nt-balance-track">
        <div className="nt-balance-fill used" style={{ width: `${usedPct}%` }} />
        <div className="nt-balance-fill pending" style={{ width: `${pendingPct}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 14.2: Implement `MyAbsencePage.tsx`**

```tsx
// apps/web/src/features/absence/MyAbsencePage.tsx
import { useState } from 'react';
import { Card } from '../../shared/ui/Card.js';
import { Pill } from '../../shared/ui/Pill.js';
import { useAuth } from '../../shared/auth/useAuth.js';
import { useBalancesQuery, useLeaveRequestsQuery, useCancelRequest } from './hooks.js';
import { BalanceBar } from './BalanceBar.js';
import { NewRequestModal } from './NewRequestModal.js';
import { toast } from 'sonner';
import { ApiError } from '../../shared/api/ApiError.js';

export function MyAbsencePage(): JSX.Element {
  const { user } = useAuth();
  const [showNew, setShowNew] = useState(false);
  const year = new Date().getUTCFullYear();
  const balances = useBalancesQuery(null, year);
  const requests = useLeaveRequestsQuery({ employeeId: undefined, page: 1, pageSize: 50 });
  const cancel = useCancelRequest();
  if (!user) return <p>—</p>;
  return (
    <div className="nt-stack">
      <Card title="My time off" actions={<button type="button" onClick={() => setShowNew(true)}>Request time off</button>}>
        {balances.isLoading && <p>Loading…</p>}
        {balances.data && (
          <div className="nt-balance-stack">
            {balances.data.data.map((b) => (
              <BalanceBar key={b.leaveType} b={b} />
            ))}
          </div>
        )}
      </Card>
      <Card title="My requests">
        {requests.isLoading && <p>Loading…</p>}
        {requests.data && (
          <table className="nt-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.data.data.map((r) => (
                <tr key={r.id}>
                  <td>{r.leaveType}</td>
                  <td>{r.fromDate} → {r.toDate}</td>
                  <td>{r.days}</td>
                  <td>
                    <Pill tone={r.status === 'approved' ? 'good' : r.status === 'declined' ? 'bad' : 'neutral'}>{r.status}</Pill>
                  </td>
                  <td>
                    {(r.status === 'pending' || (r.status === 'approved' && r.fromDate > new Date().toISOString().slice(0, 10))) && (
                      <button
                        type="button"
                        onClick={() =>
                          cancel.mutate(r.id, {
                            onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Cancel failed'),
                          })
                        }
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {showNew && <NewRequestModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
```

- [ ] **Step 14.3: Write failing test**

```tsx
// apps/web/src/features/absence/MyAbsencePage.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { MyAbsencePage } from './MyAbsencePage.js';
import { sampleRequest } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('MyAbsencePage', () => {
  it('renders balances and requests, cancel button for pending', async () => {
    renderWithProviders(<MyAbsencePage />);
    await waitFor(() => expect(screen.getByText('vacation')).toBeInTheDocument());
    expect(screen.getByText(/2026-06-01/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('cancel approved-past surfaces server toast', async () => {
    server.use(
      http.get('/api/absence/requests', () =>
        HttpResponse.json({
          data: [{ ...sampleRequest, status: 'approved', fromDate: '2099-01-01', toDate: '2099-01-01' }],
          page: 1,
          pageSize: 50,
          total: 1,
        }),
      ),
      http.post('/api/absence/requests/:id/cancel', () =>
        HttpResponse.json(
          { code: 'VALIDATION_FAILED', message: 'LEAVE_ALREADY_STARTED: already started' },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<MyAbsencePage />);
    await waitFor(() => expect(screen.getByText('vacation')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    await waitFor(() => expect(screen.getByText(/already started/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 14.4: Run — passes**

Run: `pnpm --filter web test MyAbsencePage`
Expected: PASS (2 tests).

- [ ] **Step 14.5: Commit**

```bash
git add apps/web/src/features/absence/BalanceBar.tsx apps/web/src/features/absence/MyAbsencePage.tsx apps/web/src/features/absence/MyAbsencePage.test.tsx
git commit -m "feat(web): MyAbsencePage with balance bars + cancel"
```

---

## Task 15: AbsenceQueuePage + RequestDetail

**Files:**
- Create: `apps/web/src/features/absence/RequestDetail.tsx`
- Create: `apps/web/src/features/absence/AbsenceQueuePage.tsx`
- Create: `apps/web/src/features/absence/AbsenceQueuePage.test.tsx`

- [ ] **Step 15.1: Implement `RequestDetail.tsx`**

```tsx
// apps/web/src/features/absence/RequestDetail.tsx
import type { LeaveRequestDTO } from '@naratala/shared';
import { useDecideRequest } from './hooks.js';
import { useState } from 'react';
import { ApiError } from '../../shared/api/ApiError.js';
import { toast } from 'sonner';

export function RequestDetail({ request, onActed }: { request: LeaveRequestDTO; onActed: () => void }): JSX.Element {
  const approve = useDecideRequest('approve');
  const decline = useDecideRequest('decline');
  const [note, setNote] = useState('');
  const isPending = request.status === 'pending';
  return (
    <aside className="nt-drawer" role="complementary" aria-label="request detail">
      <h3>{request.employeeName}</h3>
      <dl>
        <dt>Type</dt>
        <dd>{request.leaveType}</dd>
        <dt>Range</dt>
        <dd>{request.fromDate} → {request.toDate}</dd>
        <dt>Days</dt>
        <dd>{request.days}</dd>
        <dt>Status</dt>
        <dd>{request.status}</dd>
      </dl>
      {request.reason && (
        <section>
          <h4>Reason</h4>
          <blockquote>{request.reason}</blockquote>
        </section>
      )}
      {isPending && (
        <>
          <label>
            Note (optional)
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button
            type="button"
            disabled={approve.isPending}
            onClick={() =>
              approve.mutate(
                { id: request.id, note: note || undefined },
                {
                  onSuccess: () => onActed(),
                  onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Approve failed'),
                },
              )
            }
          >
            Approve {request.days} days
          </button>
          <button
            type="button"
            disabled={decline.isPending}
            onClick={() =>
              decline.mutate(
                { id: request.id, note: note || undefined },
                {
                  onSuccess: () => onActed(),
                  onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Decline failed'),
                },
              )
            }
          >
            Decline
          </button>
        </>
      )}
    </aside>
  );
}
```

- [ ] **Step 15.2: Implement `AbsenceQueuePage.tsx`**

```tsx
// apps/web/src/features/absence/AbsenceQueuePage.tsx
import { useState } from 'react';
import type { LeaveRequestDTO } from '@naratala/shared';
import { Card } from '../../shared/ui/Card.js';
import { useLeaveRequestsQuery } from './hooks.js';
import { RequestDetail } from './RequestDetail.js';

export function AbsenceQueuePage(): JSX.Element {
  const [filter, setFilter] = useState<'pending' | 'approved' | undefined>('pending');
  const q = useLeaveRequestsQuery({ status: filter, page: 1, pageSize: 50 });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected: LeaveRequestDTO | null = q.data?.data.find((r) => r.id === selectedId) ?? q.data?.data[0] ?? null;
  return (
    <div className="nt-absence-layout">
      <div className="nt-queue-col">
        <Card
          title="Approval queue"
          subtitle={q.data ? `${q.data.total} requests` : ''}
          actions={
            <div>
              <button type="button" aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>
                Pending
              </button>
              <button type="button" aria-pressed={filter === 'approved'} onClick={() => setFilter('approved')}>
                Approved
              </button>
              <button type="button" aria-pressed={filter === undefined} onClick={() => setFilter(undefined)}>
                All
              </button>
            </div>
          }
        >
          {q.isLoading && <p>Loading…</p>}
          {q.data && q.data.data.length === 0 && <p>All caught up — nothing to review.</p>}
          {q.data && (
            <ul className="nt-request-list">
              {q.data.data.map((r) => (
                <li key={r.id} aria-current={selected?.id === r.id} onClick={() => setSelectedId(r.id)}>
                  <strong>{r.employeeName}</strong> — {r.leaveType} · {r.days} days · {r.fromDate} → {r.toDate}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {selected && <RequestDetail request={selected} onActed={() => setSelectedId(null)} />}
    </div>
  );
}
```

- [ ] **Step 15.3: Write failing test**

```tsx
// apps/web/src/features/absence/AbsenceQueuePage.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { AbsenceQueuePage } from './AbsenceQueuePage.js';
import { sampleRequest } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('AbsenceQueuePage', () => {
  it('renders pending requests and shows detail on click', async () => {
    renderWithProviders(<AbsenceQueuePage />);
    await waitFor(() => expect(screen.getByText(/Sample Person/i)).toBeInTheDocument());
    expect(screen.getByRole('complementary', { name: /request detail/i })).toBeInTheDocument();
  });

  it('approve calls endpoint and refetches', async () => {
    let approved = false;
    server.use(
      http.post('/api/absence/requests/:id/approve', () => {
        approved = true;
        return HttpResponse.json({ ...sampleRequest, status: 'approved' });
      }),
    );
    renderWithProviders(<AbsenceQueuePage />);
    await waitFor(() => expect(screen.getByText(/Sample Person/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => expect(approved).toBe(true));
  });

  it('filter switch refetches with status param', async () => {
    const seen: string[] = [];
    server.use(
      http.get('/api/absence/requests', ({ request }) => {
        const url = new URL(request.url);
        seen.push(url.searchParams.get('status') ?? '');
        return HttpResponse.json({ data: [sampleRequest], page: 1, pageSize: 50, total: 1 });
      }),
    );
    renderWithProviders(<AbsenceQueuePage />);
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole('button', { name: /^all$/i }));
    await waitFor(() => expect(seen.includes('')).toBe(true));
  });
});
```

- [ ] **Step 15.4: Run — passes**

Run: `pnpm --filter web test AbsenceQueuePage`
Expected: PASS (3 tests).

- [ ] **Step 15.5: Commit**

```bash
git add apps/web/src/features/absence/RequestDetail.tsx apps/web/src/features/absence/AbsenceQueuePage.tsx apps/web/src/features/absence/AbsenceQueuePage.test.tsx
git commit -m "feat(web): AbsenceQueuePage + RequestDetail (approve/decline)"
```

---

## Task 16: CalendarPage

**Files:**
- Create: `apps/web/src/features/absence/CalendarPage.tsx`
- Create: `apps/web/src/features/absence/CalendarPage.test.tsx`

- [ ] **Step 16.1: Implement `CalendarPage.tsx`**

```tsx
// apps/web/src/features/absence/CalendarPage.tsx
import { useMemo, useState } from 'react';
import { useLeaveRequestsQuery, useHolidaysQuery } from './hooks.js';
import { Card } from '../../shared/ui/Card.js';

function monthRange(year: number, month: number): { from: string; to: string; days: string[] } {
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));
  const days: string[] = [];
  for (let d = new Date(first); d <= last; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10), days };
}

export function CalendarPage(): JSX.Element {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getUTCFullYear(), month: today.getUTCMonth() });
  const range = useMemo(() => monthRange(cursor.year, cursor.month), [cursor]);
  const requests = useLeaveRequestsQuery({ status: 'approved', from: range.from, to: range.to, page: 1, pageSize: 200 });
  const holidays = useHolidaysQuery(cursor.year);
  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of requests.data?.data ?? []) {
      for (const d of range.days) {
        if (d >= r.fromDate && d <= r.toDate) {
          m.set(d, [...(m.get(d) ?? []), r.employeeName]);
        }
      }
    }
    return m;
  }, [requests.data, range.days]);
  return (
    <Card
      title="Calendar"
      actions={
        <div>
          <button
            type="button"
            aria-label="previous month"
            onClick={() =>
              setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))
            }
          >
            ‹
          </button>
          <span>{cursor.year}-{String(cursor.month + 1).padStart(2, '0')}</span>
          <button
            type="button"
            aria-label="next month"
            onClick={() =>
              setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))
            }
          >
            ›
          </button>
        </div>
      }
    >
      <div className="nt-cal-grid">
        {range.days.map((d) => {
          const names = byDay.get(d) ?? [];
          const isHoliday = holidays.data?.data.some((h) => h.date === d);
          return (
            <div key={d} className={`nt-cal-cell ${isHoliday ? 'holiday' : ''}`} data-date={d}>
              <div className="nt-cal-num">{Number(d.slice(8))}</div>
              {names.slice(0, 3).map((n, i) => (
                <div key={i} className="nt-cal-pill">{n}</div>
              ))}
              {names.length > 3 && <div className="nt-cal-pill more">+{names.length - 3}</div>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
```

- [ ] **Step 16.2: Write failing test**

```tsx
// apps/web/src/features/absence/CalendarPage.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { CalendarPage } from './CalendarPage.js';
import { screen, waitFor } from '@testing-library/react';

describe('CalendarPage', () => {
  it('shows employee names on the day cell their absence covers', async () => {
    server.use(
      http.get('/api/absence/requests', () =>
        HttpResponse.json({
          data: [
            {
              id: 1,
              employeeId: 10,
              employeeName: 'Sample Person',
              actorUserId: 1,
              leaveType: 'vacation',
              fromDate: `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}-15`,
              toDate: `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}-15`,
              days: '1.00',
              reason: null,
              status: 'approved',
              decidedByUserId: null,
              decidedAt: null,
              decisionNote: null,
              cancelledByUserId: null,
              cancelledAt: null,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          page: 1,
          pageSize: 200,
          total: 1,
        }),
      ),
    );
    renderWithProviders(<CalendarPage />);
    await waitFor(() => expect(screen.getByText(/Sample Person/)).toBeInTheDocument());
  });
});
```

- [ ] **Step 16.3: Run — passes**

Run: `pnpm --filter web test CalendarPage`
Expected: PASS.

- [ ] **Step 16.4: Commit**

```bash
git add apps/web/src/features/absence/CalendarPage.tsx apps/web/src/features/absence/CalendarPage.test.tsx
git commit -m "feat(web): CalendarPage (month grid + approved requests + holidays)"
```

---

## Task 17: Settings pages (LeavePolicy, Holiday, WorkingSchedule)

**Files:**
- Create: `apps/web/src/features/absence/LeavePolicyPage.tsx`
- Create: `apps/web/src/features/absence/LeavePolicyPage.test.tsx`
- Create: `apps/web/src/features/absence/HolidayPage.tsx`
- Create: `apps/web/src/features/absence/HolidayPage.test.tsx`
- Create: `apps/web/src/features/absence/WorkingScheduleSettings.tsx`

- [ ] **Step 17.1: Implement `LeavePolicyPage.tsx`**

```tsx
// apps/web/src/features/absence/LeavePolicyPage.tsx
import { useState } from 'react';
import { Card } from '../../shared/ui/Card.js';
import { useLeavePoliciesQuery, useUpdateLeavePolicy } from './hooks.js';

export function LeavePolicyPage(): JSX.Element {
  const q = useLeavePoliciesQuery();
  const m = useUpdateLeavePolicy();
  const [editing, setEditing] = useState<{ id: number; days: number } | null>(null);
  return (
    <Card title="Leave policies (defaults)">
      {q.isLoading && <p>Loading…</p>}
      {q.data && (
        <table className="nt-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Default days/year</th>
              <th>Paid</th>
              <th>Affects balance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {q.data.data.map((p) => (
              <tr key={p.id}>
                <td>{p.leaveType}</td>
                <td>
                  {editing?.id === p.id ? (
                    <input
                      type="number"
                      step="0.5"
                      value={editing.days}
                      aria-label={`days for ${p.leaveType}`}
                      onChange={(e) => setEditing({ id: p.id, days: Number(e.target.value) })}
                      onBlur={() => {
                        m.mutate({ id: p.id, defaultDaysPerYear: editing.days }, { onSettled: () => setEditing(null) });
                      }}
                      autoFocus
                    />
                  ) : (
                    <button type="button" onClick={() => setEditing({ id: p.id, days: Number(p.defaultDaysPerYear) })}>
                      {p.defaultDaysPerYear}
                    </button>
                  )}
                </td>
                <td>{p.isPaid ? '✓' : '—'}</td>
                <td>{p.affectsBalance ? '✓' : '—'}</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
```

- [ ] **Step 17.2: Test for LeavePolicyPage**

```tsx
// apps/web/src/features/absence/LeavePolicyPage.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { LeavePolicyPage } from './LeavePolicyPage.js';
import { samplePolicies } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('LeavePolicyPage', () => {
  it('inline edits a policy and PATCHes', async () => {
    let patched: { defaultDaysPerYear?: number } | null = null;
    server.use(
      http.patch('/api/leave-policies/:id', async ({ request }) => {
        patched = (await request.json()) as { defaultDaysPerYear?: number };
        return HttpResponse.json({ ...samplePolicies[0]!, defaultDaysPerYear: '25.00' });
      }),
    );
    renderWithProviders(<LeavePolicyPage />);
    await waitFor(() => expect(screen.getByText('20.00')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: '20.00' }));
    const input = await screen.findByLabelText(/days for vacation/i);
    await userEvent.clear(input);
    await userEvent.type(input, '25');
    await userEvent.tab();
    await waitFor(() => expect(patched?.defaultDaysPerYear).toBe(25));
  });
});
```

- [ ] **Step 17.3: Run — passes**

Run: `pnpm --filter web test LeavePolicyPage`
Expected: PASS.

- [ ] **Step 17.4: Implement `HolidayPage.tsx`**

```tsx
// apps/web/src/features/absence/HolidayPage.tsx
import { useState } from 'react';
import { Card } from '../../shared/ui/Card.js';
import { useHolidaysQuery, useCreateHoliday, useDeleteHoliday } from './hooks.js';

export function HolidayPage(): JSX.Element {
  const year = new Date().getUTCFullYear();
  const q = useHolidaysQuery(year);
  const create = useCreateHoliday();
  const del = useDeleteHoliday();
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');
  const [recurring, setRecurring] = useState(false);
  return (
    <Card title="Holidays">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(
            { date, label, recurringAnnually: recurring },
            {
              onSuccess: () => {
                setDate('');
                setLabel('');
                setRecurring(false);
              },
            },
          );
        }}
      >
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Label
          <input value={label} onChange={(e) => setLabel(e.target.value)} required />
        </label>
        <label>
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          Recurring annually
        </label>
        <button type="submit" disabled={create.isPending}>
          Add
        </button>
      </form>
      {q.isLoading && <p>Loading…</p>}
      {q.data && (
        <table className="nt-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Label</th>
              <th>Recurring</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {q.data.data.map((h) => (
              <tr key={h.id}>
                <td>{h.date}</td>
                <td>{h.label}</td>
                <td>{h.recurringAnnually ? '✓' : '—'}</td>
                <td>
                  <button type="button" onClick={() => del.mutate(h.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
```

- [ ] **Step 17.5: Test for HolidayPage**

```tsx
// apps/web/src/features/absence/HolidayPage.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { HolidayPage } from './HolidayPage.js';
import { sampleHoliday } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('HolidayPage', () => {
  it('lists holidays and creates a new one', async () => {
    let stored = [sampleHoliday];
    server.use(
      http.get('/api/holidays', () => HttpResponse.json({ data: stored })),
      http.post('/api/holidays', async ({ request }) => {
        const body = (await request.json()) as { date: string; label: string; recurringAnnually?: boolean };
        const next = { ...sampleHoliday, id: 99, ...body };
        stored = [...stored, next];
        return HttpResponse.json(next, { status: 201 });
      }),
    );
    renderWithProviders(<HolidayPage />);
    await waitFor(() => expect(screen.getByText(sampleHoliday.label)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/date/i), '2026-12-25');
    await userEvent.type(screen.getByLabelText(/label/i), 'Christmas');
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    await waitFor(() => expect(screen.getByText('Christmas')).toBeInTheDocument());
  });
});
```

- [ ] **Step 17.6: Run — passes**

Run: `pnpm --filter web test HolidayPage`
Expected: PASS.

- [ ] **Step 17.7: Implement `WorkingScheduleSettings.tsx`**

```tsx
// apps/web/src/features/absence/WorkingScheduleSettings.tsx
import { useState } from 'react';
import { Card } from '../../shared/ui/Card.js';
import { useScheduleQuery, useUpdateDefaultSchedule } from './hooks.js';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WorkingScheduleSettings(): JSX.Element {
  const q = useScheduleQuery();
  const m = useUpdateDefaultSchedule();
  const [bits, setBits] = useState<number | null>(null);
  const current = bits ?? q.data?.defaultWorkingDays ?? 0;
  return (
    <Card title="Working schedule">
      {q.isLoading && <p>Loading…</p>}
      {q.data && (
        <>
          <p>Company default — which days count as working days for absence math.</p>
          <div role="group" aria-label="working days">
            {DAY_LABELS.map((label, i) => (
              <label key={label}>
                <input
                  type="checkbox"
                  checked={(current & (1 << i)) !== 0}
                  onChange={(e) => {
                    const next = e.target.checked ? current | (1 << i) : current & ~(1 << i);
                    setBits(next);
                  }}
                />
                {label}
              </label>
            ))}
          </div>
          <button type="button" disabled={bits === null || m.isPending} onClick={() => m.mutate(current)}>
            Save default
          </button>
        </>
      )}
    </Card>
  );
}
```

- [ ] **Step 17.8: Commit**

```bash
git add apps/web/src/features/absence/LeavePolicyPage.tsx apps/web/src/features/absence/LeavePolicyPage.test.tsx apps/web/src/features/absence/HolidayPage.tsx apps/web/src/features/absence/HolidayPage.test.tsx apps/web/src/features/absence/WorkingScheduleSettings.tsx
git commit -m "feat(web): absence settings pages (policies, holidays, schedule)"
```

---

## Task 18: Routes + sidebar wiring + i18n keys

**Files:**
- Modify: `apps/web/src/app/routes.tsx`
- Modify: `apps/web/src/shared/ui/Sidebar.tsx`
- Modify: `apps/web/src/shared/i18n/locales/en.json`
- Modify: `apps/web/src/shared/i18n/locales/id.json`

- [ ] **Step 18.1: Add absence routes**

In `apps/web/src/app/routes.tsx`, add imports:

```tsx
import { MyAbsencePage } from '../features/absence/MyAbsencePage.js';
import { AbsenceQueuePage } from '../features/absence/AbsenceQueuePage.js';
import { CalendarPage } from '../features/absence/CalendarPage.js';
import { LeavePolicyPage } from '../features/absence/LeavePolicyPage.js';
import { HolidayPage } from '../features/absence/HolidayPage.js';
import { WorkingScheduleSettings } from '../features/absence/WorkingScheduleSettings.js';
```

Inside the protected `<Route element={<Shell />}>` group, add:

```tsx
        <Route path="/absence" element={<RequirePermission perm="absence:approve:reports"><AbsenceQueuePage /></RequirePermission>} />
        <Route path="/absence/me" element={<MyAbsencePage />} />
        <Route path="/absence/calendar" element={<CalendarPage />} />
        <Route path="/absence/settings/policies" element={<RequirePermission perm="absence:configure"><LeavePolicyPage /></RequirePermission>} />
        <Route path="/absence/settings/holidays" element={<RequirePermission perm="absence:configure"><HolidayPage /></RequirePermission>} />
        <Route path="/absence/settings/schedule" element={<RequirePermission perm="absence:configure"><WorkingScheduleSettings /></RequirePermission>} />
```

- [ ] **Step 18.2: Extend `Sidebar.tsx`**

In `apps/web/src/shared/ui/Sidebar.tsx`, modify `ITEMS`:

```ts
const ITEMS: Item[] = [
  { to: '/employees', label: 'Employees', perm: 'employees:read:any' },
  { to: '/departments', label: 'Departments' },
  { to: '/absence/me', label: 'My time off', perm: 'absence:read:self' },
  { to: '/absence', label: 'Absence queue', perm: 'absence:approve:reports' },
  { to: '/absence/calendar', label: 'Calendar', perm: 'absence:read:self' },
  { to: '/absence/settings/policies', label: 'Leave policies', perm: 'absence:configure' },
  { to: '/absence/settings/holidays', label: 'Holidays', perm: 'absence:configure' },
  { to: '/absence/settings/schedule', label: 'Working schedule', perm: 'absence:configure' },
  { to: '/users', label: 'Users', perm: 'users:read' },
  { to: '/audit', label: 'Audit', perm: 'audit:read' },
  { to: '/settings/profile', label: 'Profile' },
];
```

- [ ] **Step 18.3: Add i18n keys**

In both `apps/web/src/shared/i18n/locales/en.json` and `id.json`, add an `absence` block under root:

```json
  "absence": {
    "queue": "Absence queue",
    "myTimeOff": "My time off",
    "calendar": "Calendar",
    "leavePolicies": "Leave policies",
    "holidays": "Holidays",
    "workingSchedule": "Working schedule",
    "request": "Request time off",
    "approve": "Approve",
    "decline": "Decline",
    "cancel": "Cancel"
  }
```

For the id.json version, translate values to Indonesian:

```json
  "absence": {
    "queue": "Antrian cuti",
    "myTimeOff": "Cuti saya",
    "calendar": "Kalender",
    "leavePolicies": "Kebijakan cuti",
    "holidays": "Hari libur",
    "workingSchedule": "Jadwal kerja",
    "request": "Ajukan cuti",
    "approve": "Setujui",
    "decline": "Tolak",
    "cancel": "Batalkan"
  }
```

- [ ] **Step 18.4: Run all web tests + typecheck**

Run: `pnpm --filter web test && pnpm --filter web typecheck`
Expected: green.

- [ ] **Step 18.5: Commit**

```bash
git add apps/web/src/app/routes.tsx apps/web/src/shared/ui/Sidebar.tsx apps/web/src/shared/i18n/locales/
git commit -m "feat(web): wire absence routes + sidebar nav + i18n keys"
```

---

## Task 19: Manual smoke + finishing

- [ ] **Step 19.1: Run full test + typecheck + build**

Run: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm -r build`
Expected: all green.

- [ ] **Step 19.2: Smoke check**

Terminal A: `pnpm --filter api dev`
Terminal B: `pnpm --filter web dev`

In a browser:
1. `http://localhost:5173/login` — sign in as seeded admin
2. Navigate to **Holidays** → add a holiday for next Friday → save
3. Navigate to **Working schedule** → confirm Mon–Fri checked → save
4. Navigate to **My time off** → click **Request time off** → fill type=vacation, from=next Mon, to=next Fri → submit → confirm balance bar shows pending +5
5. Sign out → sign in as a `manager` whose direct report is the one above (set up via Users + employee records) → navigate to **Absence queue** → click the request → click **Approve** → confirm row disappears from pending
6. Sign back in as the original employee → My time off → confirm status shown as approved → click **Cancel** (since `from` is future) → confirm balance restored
7. Open `/audit` as admin → verify `leave_request.submit`, `leave_request.approve`, `leave_request.cancel` entries appear

- [ ] **Step 19.3: Use the finishing-a-development-branch skill**

Announce: "I'm using the finishing-a-development-branch skill to complete this work."

Follow that skill: verify tests pass (`pnpm test`), present the four options (merge / PR / keep / discard) to the user, execute the chosen path.

---

## Notes for Implementation

- **Decimal arithmetic:** `dayCounter` returns a number (e.g. `5`), but the database column is `decimal(5,2)`. Convert at the storage boundary via `.toFixed(2)`. Tests assert string equality (`'5.00'`) on read paths and number equality (`5`) on pure-function paths.
- **Forward-compat for half-days:** the API/DTO contract uses string `days` (e.g. `"5.00"`) so adding `from_half`/`to_half` columns later only changes the submit payload + `dayCounter` signature. UI parses `days` with `Number()`.
- **Permission scoping is split:** `authorize(perm)` filters routes by role; service-level scope checks (manager-only-for-reports) live in `leaveRequestService` because they need DB lookups.
- **Manager-on-behalf auto-approves:** spec §5 — manager submitting for a report is implicitly an approval. Service writes `decided_by_user_id = actor` and `decided_at = now`, plus an audit entry tagged `leave_request.submit` (not `.approve`) so the timeline is honest about how it became approved.
- **`employee.findByUserId`:** the leaveRequestRoutes reads the actor's employee record to get `actor.employeeId`. If the actor is admin/HR with no employee row, `actor.employeeId === null` and the service treats them as "all-access" via the `absence:read:any`/`absence:approve:any` permissions.
- **Holiday recurring expansion** is computed at request-submit time, not stored; this means changing a holiday after a request is submitted won't retroactively change `days`. That's the right behavior: `days` is a snapshot.
- **Sidebar grows long.** If it becomes unwieldy, group "Absence" items under a collapsible parent. Out of scope for this plan.


