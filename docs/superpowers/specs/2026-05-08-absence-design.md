# Naratala HRIS — Phase 3 Absence Design

**Date:** 2026-05-08
**Scope:** Absence/Time-off feature — backend module under `apps/api/src/modules/absence/` plus frontend feature under `apps/web/src/features/absence/`. Wires into existing Phase 1 backend (auth, employees, departments, RBAC, audit, mailer) and Phase 2 frontend SPA.

---

## §1 Architecture overview

A new backend module `apps/api/src/modules/absence/` (parallel to `employees/`) and a frontend feature `apps/web/src/features/absence/`. Reuses every Phase 1 primitive: JWT auth, `validate` middleware, `authorize`, `audit_log`, `Mailer`, `EmployeeRepo` for manager lookup. Reuses Phase 2 SPA shell, `usePermission`, MSW test infra, RHF + zodResolver against new shared schemas.

**Components and boundaries:**

- **`leavePolicyRepo` + `leavePolicyService`** — CRUD for `leave_policies` (one row per leave type — the company-wide default quota + paid/affects-balance flags).
- **`leaveQuotaService`** — read-only resolver: `quotaFor(employeeId, leaveType)` returns `override ?? policy.default`.
- **`holidayRepo` + `holidayService`** — CRUD for `holidays` (date, label, recurring-annually flag).
- **`workingScheduleService`** — `workingDaysFor(employee)` returns the bitmask (`employee.workingDays ?? company.defaultWorkingDays`).
- **`dayCounter`** — pure function `countDays(from, to, workingDaysBitmask, holidayDates)` → `decimal(5,2)`. Walks the date range, skips non-working days and holidays. Returns decimal so half-day extension is a column-add, not a data migration.
- **`balanceService`** — `balanceFor(employeeId, year, leaveType)` → `{ quota, used, pending, available }`. Sums `approved` and `pending` requests.
- **`leaveRequestRepo` + `leaveRequestService`** — request lifecycle: `submit`, `approve`, `decline`, `cancel`. Manager-on-behalf submissions auto-approve. Cancel-after-approval is allowed when `from > today`.
- **Routers:** `leaveRequestRoutes`, `leavePolicyRoutes`, `holidayRoutes`, `workingScheduleRoutes`. Wired in `bootstrap/wireApp.ts`.
- **Frontend:** `AbsencePage` (manager queue + KPIs + calendar), `MyAbsencePage` (employee view), `NewRequestModal`, `RequestDetail` (right rail), `LeavePolicyPage` + `HolidayPage` + `WorkingScheduleSettings` (HR/admin config).

**Forward-compat:** `days` and balance amounts stored as `decimal(5,2)`. Half-day support later requires only `from_half`/`to_half` enum columns on `leave_requests`. No data migration.

---

## §2 Database schema

Five new tables and one column addition to `employees`. All use the existing `ts` shorthand (`createdAt`/`updatedAt` with `fsp: 3`).

### `employees` — column addition

```ts
workingDays: smallint('working_days'), // bitmask: bit 0=Sun ... bit 6=Sat. NULL means inherit company default.
```

### `company_settings` (new singleton)

Single-row table for company-wide defaults. Migration seeds row id=1.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint unsigned PK` | always 1 |
| `default_working_days` | `smallint not null default 62` | `0b0111110` = Mon–Fri |
| `created_at`, `updated_at` | `ts` | |

### `leave_policies`

One row per `leave_type`. Seeded by migration with the 6 default types.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint unsigned PK` | |
| `leave_type` | `enum('vacation','sick','personal','bereavement','parental','unpaid')` | unique |
| `default_days_per_year` | `decimal(5,2) not null` | |
| `is_paid` | `boolean not null` | |
| `affects_balance` | `boolean not null` | `unpaid`: false |
| `created_at`, `updated_at` | `ts` | |

Unique index on `leave_type`.

### `leave_quotas`

Sparse per-employee overrides. Absence of a row means "use policy default".

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint unsigned PK` | |
| `employee_id` | `bigint unsigned not null` | |
| `leave_type` | enum (same as above) | |
| `days_per_year` | `decimal(5,2) not null` | |
| `created_at`, `updated_at` | `ts` | |

Unique index `(employee_id, leave_type)`.

### `holidays`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint unsigned PK` | |
| `date` | `date not null` | |
| `label` | `varchar(120) not null` | |
| `recurring_annually` | `boolean not null default false` | if true, `date` MM-DD applied each year |
| `created_at`, `updated_at` | `ts` | |

Unique index on `(date, label)`. Index on `date` for date-range scans.

### `leave_requests`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint unsigned PK` | |
| `employee_id` | `bigint unsigned not null` | |
| `actor_user_id` | `bigint unsigned not null` | who entered the request (employee or manager-on-behalf) |
| `leave_type` | enum (same) | |
| `from_date` | `date not null` | |
| `to_date` | `date not null` | |
| `days` | `decimal(5,2) not null` | snapshot at submission time |
| `reason` | `varchar(500)` | |
| `status` | `enum('pending','approved','declined','cancelled') not null default 'pending'` | |
| `decided_by_user_id` | `bigint unsigned` | nullable until decided |
| `decided_at` | `datetime fsp 3` | nullable |
| `decision_note` | `varchar(500)` | nullable |
| `cancelled_by_user_id` | `bigint unsigned` | nullable |
| `cancelled_at` | `datetime fsp 3` | nullable |
| `created_at`, `updated_at` | `ts` | |

Indexes: `(employee_id, from_date)`, `(status, from_date)`, `from_date`.

---

## §3 API surface

All under `/api/absence/*` (and `/api/holidays`, `/api/leave-policies`, `/api/working-schedule` for config). Same envelope conventions as Phase 1: JSON body validated by Zod, errors via `errorHandler`, `ApiErrorBody { code, message, details? }`.

### Leave requests

- `POST   /api/absence/requests` — submit. Body: `{ employeeId?, leaveType, fromDate, toDate, reason? }`. If `employeeId` omitted → uses caller's own employee record. If `employeeId !== caller` → requires `absence:write:any` (manager/HR/admin) → auto-approves. Server computes `days` from working schedule + holidays.
- `GET    /api/absence/requests` — list. Query: `status?`, `employeeId?`, `from?`, `to?`, `page`, `pageSize`. Scope: employee → own only; manager → own + their direct reports; HR/admin → all.
- `GET    /api/absence/requests/:id` — detail.
- `POST   /api/absence/requests/:id/approve` — body `{ note? }`. Permission: `absence:approve:reports` (manager for own report) OR `absence:approve:any` (HR/admin override).
- `POST   /api/absence/requests/:id/decline` — body `{ note? }`. Same permissions.
- `POST   /api/absence/requests/:id/cancel` — employee can cancel own (any state where `from > today` for approved, or always for pending); manager/HR can cancel for reports/any. 400 `LEAVE_ALREADY_STARTED` if attempting to cancel approved with `from <= today`.

### Balances

- `GET /api/absence/balances?employeeId=&year=` — returns `[{ leaveType, quota, used, pending, available }]` for all 6 types. `employeeId` defaults to caller; non-self requires `absence:read:any` or `absence:read:reports`.

### Calendar

- `GET /api/absence/calendar?from=&to=&scope=team|all` — returns `[{ date, requests: [{ id, employeeId, employeeName, avatarHue, leaveType }] }]` for date cells. `scope=team`: caller's department. `scope=all`: requires `absence:read:any`.

### Holidays

- `GET /api/holidays?year=` — list. Public to authenticated users.
- `POST /api/holidays`, `PATCH /api/holidays/:id`, `DELETE /api/holidays/:id` — `absence:configure`.

### Leave policies

- `GET /api/leave-policies` — list (public to authenticated).
- `PATCH /api/leave-policies/:id` — body `{ defaultDaysPerYear?, isPaid?, affectsBalance? }`. `absence:configure`.

### Per-employee quota override

- `GET /api/employees/:id/leave-quotas` — list overrides for one employee.
- `PUT /api/employees/:id/leave-quotas/:leaveType` — body `{ daysPerYear }`. Upserts. `absence:configure`.
- `DELETE /api/employees/:id/leave-quotas/:leaveType` — removes override (falls back to policy default). `absence:configure`.

### Working schedule

- `GET /api/working-schedule` — returns `{ defaultWorkingDays, perEmployeeOverrides: [{ employeeId, workingDays }] }`. `absence:configure`.
- `PATCH /api/working-schedule/default` — body `{ workingDays }` (bitmask 0–127). `absence:configure`.
- `PATCH /api/employees/:id/working-schedule` — body `{ workingDays | null }`. `absence:configure`.

---

## §4 Day-counting & balance service

**`dayCounter.countDays(from, to, workingDays, holidayDates) → number`** (always returns decimal-safe number, e.g. `5`, `0.5` post-half-day):

```ts
function countDays(from: Date, to: Date, wd: number, holidays: Set<string>): number {
  if (to < from) throw new RangeError('to < from');
  let n = 0;
  for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay(); // 0=Sun..6=Sat
    if (!(wd & (1 << dow))) continue;
    if (holidays.has(d.toISOString().slice(0, 10))) continue;
    n += 1;
  }
  return n;
}
```

**Holiday set construction** (`holidayService.holidayDatesIn(from, to)`): for each row, if `recurring_annually=true` expand to one occurrence per year in the range; else include literal date.

**`balanceService.balanceFor(employeeId, year, leaveType) → { quota, used, pending, available }`**:
- `quota = leaveQuotaService.quotaFor(employeeId, leaveType)` (override or policy default)
- `used = sum(days) of approved requests for that employee/year/type`
- `pending = sum(days) of pending requests for that employee/year/type`
- `available = quota - used - pending` (clamped at 0 for display; server still allows negative — manager can approve over-quota with the audit trail)

**`leaveRequestService.submit(input)`**:
1. Resolve employee (caller-self or manager-on-behalf with permission check).
2. Compute `days` via `dayCounter` using employee's working schedule + holidays in `[from, to]`.
3. If days==0 → 400 `LEAVE_ZERO_DAYS`.
4. Reject if `to < from` → 400 `VALIDATION_FAILED`.
5. Insert with `status=pending` (or `status=approved`+`decided_by=actor` if manager-on-behalf).
6. Write `audit_log` entry.
7. If pending → mail manager (or HR if no manager). If auto-approved → mail employee.

**`approve/decline/cancel`** — guard transitions in service; only `pending`→`approved/declined`, only `approved`→`cancelled` when `from > today`. Each writes audit + sends mail.

---

## §5 RBAC additions

New permissions (added to `packages/shared/src/permissions.ts`):

```ts
| 'absence:read:self'        // own requests + balances
| 'absence:read:reports'     // direct-reports' requests + balances
| 'absence:read:any'         // all
| 'absence:write:self'       // submit own
| 'absence:write:any'        // submit on behalf (auto-approves)
| 'absence:approve:reports'  // approve/decline/cancel for direct reports
| 'absence:approve:any'      // approve/decline/cancel for anyone
| 'absence:configure'        // policies, holidays, quotas, working schedule
```

Role grants (additive to Phase 1):
- **admin**: all eight
- **hr**: all read variants, `absence:write:any`, `absence:approve:any`, `absence:configure`
- **manager**: `absence:read:self`, `absence:read:reports`, `absence:write:self`, `absence:write:any` (only for direct reports — enforced in service), `absence:approve:reports`
- **employee**: `absence:read:self`, `absence:write:self`

Service-layer scope guards: `manager` may submit on behalf only for employees whose `manager_id === caller.employeeId`; permission check passes but service returns 403 `OUT_OF_SCOPE` otherwise.

---

## §6 Frontend pages

Wired into Phase 2 sidebar between "Departments" and "Users" with permission `absence:read:self` (visible to all roles).

### Routes

```
/absence                      → AbsenceQueuePage   (manager/HR/admin)
/absence/me                   → MyAbsencePage      (everyone — own requests + balances)
/absence/calendar             → CalendarPage       (everyone — team scope; HR/admin can switch to all)
/absence/settings/policies    → LeavePolicyPage    (gated absence:configure)
/absence/settings/holidays    → HolidayPage        (gated absence:configure)
/absence/settings/schedule    → WorkingScheduleSettings (gated absence:configure)
```

Sidebar shows "Absence" parent that expands to "Queue" (if `absence:approve:reports` or above), "My time off" (always), "Calendar" (always), "Settings" (if `absence:configure`).

### `AbsenceQueuePage` (port of `components/absence.jsx`)

- KPI strip: pending count, out today (from approved + active), urgent (pending > 7 days old), days used YTD.
- Filter chips: pending / approved / all.
- Request list (left): clickable rows show requester avatar+name, leave-type chip, days, date range, reason snippet, urgency pill, action buttons (approve/decline) for pending.
- Right rail (`RequestDetail`): selected request — requester profile link, full reason, balance bars (vacation/sick/personal as in prototype) showing post-approval balance, conflicts (other approved absences in same dept on overlapping dates), "Approve N days" / "Decline" buttons, message composer (sends note via decline/approve note field).
- Calendar widget below (same `CalendarPage`-style grid).

### `MyAbsencePage`

- Top: "Request time off" button → `NewRequestModal`.
- Balance cards row: one per leave type with quota/used/pending bars.
- "My requests" table: type, dates, days, status pill, decided by, action (cancel if pending or approved-future).

### `NewRequestModal`

RHF + zodResolver against `LeaveRequestCreate`. Fields: leave type, from, to, reason. Live-computed days preview ("This request: 3 working days") via client-side replay of the same `countDays` algorithm (sharing the same code via `packages/shared` would be ideal — but for v1 the server is the source of truth and the client preview shows "computed on submit"). Submit → invalidates `qk.absence.myRequests` + `qk.absence.balances`.

### `LeavePolicyPage`, `HolidayPage`, `WorkingScheduleSettings`

Standard CRUD tables. `LeavePolicyPage` shows the 6 fixed leave types as rows with inline-editable `defaultDaysPerYear`, `isPaid`, `affectsBalance`. `HolidayPage` is a list with add/edit/delete + a year filter. `WorkingScheduleSettings` shows the company default (7 day-of-week checkboxes) + a table of per-employee overrides with inline-editable checkboxes.

### Sidebar permissions matrix update

| Item | Permission |
|------|------------|
| Absence → Queue | `absence:approve:reports` |
| Absence → My time off | `absence:read:self` |
| Absence → Calendar | `absence:read:self` |
| Absence → Settings | `absence:configure` |

---

## §7 Notifications & i18n

**Mail templates** (added to `apps/api/src/shared/mail/templates.ts`):
- `leaveRequestSubmittedEmail(approver, request)` → sent to manager (or all HR if no manager) on `submit`.
- `leaveRequestDecidedEmail(employee, request)` → sent to employee on `approve` / `decline`.
- `leaveRequestCancelledEmail(approver, request)` → sent to manager when employee cancels approved request.

All templates respect recipient's `user.language` (id/en) — pull translations from a small in-server map keyed by locale.

**Frontend i18n:** add `absence.*` keys to both `id.json` and `en.json` covering all UI strings.

---

## §8 Testing strategy

Mirror Phase 1/2 patterns.

### Backend

- `dayCounter.test.ts` — pure function tests: weekend skip, holiday skip, single-day, full week, weekend-only span (returns 0), recurring-annual holiday across years.
- `balanceService.test.ts` — quota = override > policy default; pending + approved sum correctly; year boundary respected.
- `leaveRequestService.test.ts` — submit happy path; manager-on-behalf auto-approves; over-quota submit allowed but flagged in audit; approve/decline transitions; cancel-pending; cancel-approved-future succeeds; cancel-approved-past returns `LEAVE_ALREADY_STARTED`; permission scope (manager can't approve for non-report).
- `leaveRequestRoutes.test.ts` — HTTP-level: list scoping (employee sees own only, manager sees own + reports, HR sees all); 403 on missing permission.
- `holidayService.test.ts` — recurring expansion; CRUD.
- `permissionMatrix.test.ts` (extension) — add cases for all 8 new permissions × 4 roles.

### Frontend

- `NewRequestModal.test.tsx` — submits via msw; surfaces field errors; closes on success.
- `AbsenceQueuePage.test.tsx` — pending count; approve action calls endpoint and removes row; decline action; manager sees only their reports (msw scope).
- `MyAbsencePage.test.tsx` — balances render; cancel pending works; cancel approved-future works; cancel approved-past shows toast.
- `RequestDetail.test.tsx` — balance bars include post-approval delta.
- `LeavePolicyPage.test.tsx` — inline edit triggers PATCH and refetch.
- `HolidayPage.test.tsx` — create + delete.

### Coverage gate

Same as Phase 2: `pnpm -r test` runs both packages; no hard CI gate, but ≥80% on new files.

---

## §9 Implementation order

1. Migration: `0001_absence.sql` + drizzle schema additions (employees.workingDays, company_settings, leave_policies, leave_quotas, holidays, leave_requests). Seed leave_policies with 6 defaults; seed company_settings row with `0b0111110`.
2. Shared schemas: `LeaveType` enum, `LeaveRequestCreate`, `LeaveRequestDecisionBody`, `HolidayCreate`, `WorkingScheduleUpdate`, `LeaveRequestDTO`, `BalanceDTO` in `packages/shared/src/schemas/absence.ts`.
3. Permissions: extend `Permission` union + `ROLE_PERMISSIONS` in `packages/shared/src/permissions.ts`.
4. `dayCounter` (pure) + tests.
5. `holidayRepo` + `holidayService` + tests.
6. `leavePolicyRepo` + `leavePolicyService` + tests.
7. `workingScheduleService` + tests.
8. `leaveQuotaService` + tests.
9. `balanceService` + tests.
10. `leaveRequestRepo` + `leaveRequestService` (submit/approve/decline/cancel) + tests.
11. Mail templates + integration.
12. Routers (`leaveRequestRoutes`, `leavePolicyRoutes`, `holidayRoutes`, `workingScheduleRoutes`) + wire in `wireApp.ts` + permissionMatrix tests.
13. Frontend hooks (`useLeaveRequests`, `useBalances`, `useHolidays`, `useLeavePolicies`).
14. `NewRequestModal` + tests.
15. `MyAbsencePage` + tests.
16. `AbsenceQueuePage` + `RequestDetail` + tests.
17. `CalendarPage` + tests.
18. Settings pages (`LeavePolicyPage`, `HolidayPage`, `WorkingScheduleSettings`) + tests.
19. Sidebar wiring + i18n keys.
20. Manual smoke + finishing.

---

## §10 Out of scope

- Half-day requests (forward-compat present; add `from_half`/`to_half` columns when ready).
- Multi-step approval (HR-after-manager). Locked-in: manager-only with HR override.
- Carryover / accrual schedules. Locked-in: annual fixed quota, resets Jan 1.
- Configurable leave types beyond the 6 enum values.
- Attachments (medical certificates etc.).
- Coverage assignment workflow ("X will cover for me") — prototype shows it but it's unenforced.
- Conflict detection beyond same-department overlap (no calendar-event integration).
- Email digests / reminders for stale pending requests.
- Mobile-responsive polish beyond inheriting Phase 2 CSS.
- Reports / analytics ("days used by department" charts).
- Payroll integration (unpaid leave doesn't yet feed anywhere).
