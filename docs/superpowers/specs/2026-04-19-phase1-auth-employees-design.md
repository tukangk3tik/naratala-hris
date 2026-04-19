# Phase 1 — Auth + Users/Roles + Employees: Design

- **Date:** 2026-04-19
- **Status:** Approved
- **Scope:** Foundation slice of the Naratala HRIS product, derived from the Claude Design prototype at `components/` + `styles.css`.
- **Out of scope (deferred to later phases):** absence (Phase 2), payroll (Phase 3), benefits (Phase 4), recruiting (Phase 5).

---

## 1. Context

Naratala HRIS is an internal HR admin system for a single company ("Naratala", ~50–200 employees). A functional React prototype already exists under `components/`; it renders all five modules but is backed by mock data. This document specifies the real product for Phase 1 only.

Phase 1 delivers:
- A working authentication system (JWT access + HttpOnly refresh cookie, TOTP MFA for admin/hr).
- A user + role model (admin, hr, manager, employee).
- Employee data management (directory, profile drawer, add-person flow) backed by MySQL.
- Department CRUD, invite-based onboarding, audit logging, and the reverse-proxy-friendly deployment posture needed to stand the app up.

## 2. Tech stack (decided)

| Area | Choice |
|---|---|
| Monorepo | pnpm workspaces |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + React Router v6 + TanStack Query v5 + Zustand + React Hook Form + zod + i18next + axios |
| Backend | Node 20 + Express 4 + TypeScript + Drizzle ORM + mysql2 + zod + jsonwebtoken + bcrypt + nodemailer + helmet + express-rate-limit + pino |
| Database | MySQL 8.0+, InnoDB, `utf8mb4_0900_ai_ci` |
| Mail (dev) | Mailhog (standalone Docker container) |
| Testing | Vitest + supertest; TDD on auth/permissions; manual FE in Phase 1 |
| API style | REST under `/api/...` (unversioned) |

## 3. Repository layout

```
naratala-hris/
├── apps/
│   ├── web/          React + TS + Vite + Tailwind
│   └── api/          Node + TS + Express + Drizzle
├── packages/
│   └── shared/       zod schemas, TS types, role/permission constants, error codes
├── docs/
│   └── superpowers/  specs/ and (later) plans/
├── components/       (the prototype — kept for visual reference during FE port; deleted after FE milestone)
├── styles.css        (prototype CSS — reference; tokens ported to tailwind.config.js)
├── pnpm-workspace.yaml
└── package.json
```

## 4. Architecture

### 4.1 Runtime topology (Phase 1)

```
Browser ──HTTPS──▶ Nginx/Caddy ──▶ Express API ──▶ MySQL 8.0
                       │                  │
                       │                  └──SMTP──▶ Mailhog (dev) / real SMTP (prod)
                       │
                       └──▶ static /web/dist assets
```

Single Express process, single MySQL instance, no Redis/queue/worker. Email sending is inline with try/catch; a mail failure is logged and surfaced as a "resend invite" action in the UI, not a user-facing error.

### 4.2 Request pipeline

```
request
  → requestId middleware (pino log correlation via X-Request-Id)
  → helmet + cors (origin allowlist)
  → JSON body parser (100KB limit; urlencoded off)
  → rate limiter (global + per-route)
  → zod validator (body/query/params; .strict())
  → authenticate (JWT → req.user or 401)
  → authorize (permission check)
  → controller → service → repository → Drizzle → MySQL
  → response shaper
  → error handler (domain → HTTP; prod redaction)
```

### 4.3 Backend module structure (feature-modules / Approach B)

```
apps/api/src/
├── modules/
│   ├── auth/          { routes, controller, service, tokens, mfa, invites,
│   │                    repositories, schemas, tests }
│   ├── users/         { routes, controller, service, repo, schemas, tests }
│   ├── employees/     { routes, controller, service, repo, dto, audit,
│   │                    permissionScope, schemas, tests }
│   ├── departments/   { routes, controller, service, repo, schemas, tests }
│   └── audit/         { routes, controller, service, repo, tests }
├── shared/
│   ├── middlewares/   authenticate, authorize, errorHandler, rateLimit,
│   │                  requestId, validate
│   ├── db/            drizzle client, schema, migrations
│   ├── mail/          transport, templates (en only)
│   ├── errors/        NotFound, Forbidden, ValidationError, RateLimited, AuthError
│   ├── rbac/          permissions map (imported from packages/shared)
│   └── config/        env loader with boot-time assertions
├── bootstrap/         seedAdmin, seedDepartments, seedDevEmployees, migrateRunner
├── app.ts             express wiring
└── server.ts          entry
```

Cross-feature calls go through a service's public interface. No module reaches into another module's repository. Services depend on repository **interfaces** (Dependency Inversion); concrete Drizzle repos are wired in `bootstrap/`.

### 4.4 Frontend folder layout

```
apps/web/src/
├── app/               routes.tsx, providers.tsx, main.tsx
├── features/
│   ├── auth/          api, store (Zustand), routes, components
│   ├── employees/     api, routes, components, hooks
│   └── shell/         Shell, Sidebar, TopBar, TweaksPanel
├── components/ui/     Button, Input, Select, Table, Drawer, Modal, Toast, Badge, Avatar, icons
├── lib/               apiClient (axios), permissions, i18n, theme
├── styles/            index.css (Tailwind base + CSS variables)
└── vite.config.ts
```

Prototype → real-app mapping:
- `components/shell.jsx` → `features/shell/*` (TSX + Tailwind).
- `components/employees.jsx` → `features/employees/*`, wired to real API.
- `components/data.jsx` → deleted; server is authoritative. Dev seed lives in `apps/api/src/bootstrap/seedDevEmployees.ts` using the same names for continuity.
- `components/i18n.jsx` → `apps/web/src/lib/i18n.ts`; same keys and catalog.
- `components/icons.jsx` → `components/ui/icons.tsx`.
- `styles.css` → Tailwind config extensions + `base.css` for display type and runtime accent CSS variables.
- `absence`, `other-views` → placeholder "Coming in Phase N" pages; sidebar navigation preserved.

### 4.5 Shared contract (`packages/shared`)

One zod schema per DTO. API validates requests against it. Frontend imports the same schema for form validation and infers TS types. Breaking a contract breaks the type-check in both apps in the same PR — no drift possible.

Exports:
- `schemas/` — `LoginBody`, `InviteBody`, `AcceptInviteBody`, `EmployeeCreate`, `EmployeeUpdate`, `EmployeeDTO`, `DepartmentDTO`, `UserDTO`, etc.
- `permissions.ts` — `Role`, `Permission`, `ROLE_PERMISSIONS` map (see §7).
- `errors.ts` — stable error code enum.
- `index.ts` — re-exports.

## 5. Data model

All tables `InnoDB`, `utf8mb4_0900_ai_ci`, PKs `BIGINT UNSIGNED`, timestamps `DATETIME(3)` with `ON UPDATE CURRENT_TIMESTAMP(3)`. Soft-delete via `deleted_at` on `users` and `employees` only (audit preservation); all other tables hard-delete.

### 5.1 `users`
```
id                   BIGINT UNSIGNED PK
email                VARCHAR(255) NOT NULL               -- stored lowercase; UNIQUE
password_hash        VARCHAR(255) NOT NULL               -- bcrypt cost 12
role                 ENUM('admin','hr','manager','employee') NOT NULL
status               ENUM('pending','active','disabled') NOT NULL DEFAULT 'pending'
must_change_password BOOLEAN NOT NULL DEFAULT 0
mfa_secret           VARBINARY(255) NULL                 -- AES-256-GCM encrypted
mfa_enabled          BOOLEAN NOT NULL DEFAULT 0
language             ENUM('id','en') NOT NULL DEFAULT 'id'
last_login_at        DATETIME(3) NULL
created_at, updated_at, deleted_at
INDEX (status), INDEX (role)
UNIQUE (email)
```

### 5.2 `employees`
```
id                 BIGINT UNSIGNED PK
user_id            BIGINT UNSIGNED NULL UNIQUE FK→users.id ON DELETE SET NULL
full_name          VARCHAR(160) NOT NULL
email              VARCHAR(255) NOT NULL UNIQUE         -- work email; may differ from login email
phone              VARCHAR(32)  NULL
pronouns           VARCHAR(32)  NULL
department_id      BIGINT UNSIGNED NOT NULL FK→departments.id
position           VARCHAR(120) NOT NULL
location           VARCHAR(120) NULL
employment_type    ENUM('full_time','part_time','contract','intern') NOT NULL
employment_status  ENUM('active','on_leave','terminated') NOT NULL DEFAULT 'active'
hire_date          DATE NOT NULL
manager_id         BIGINT UNSIGNED NULL FK→employees.id ON DELETE SET NULL
salary_amount      DECIMAL(14,2) NULL
salary_currency    CHAR(3) NOT NULL DEFAULT 'IDR'
avatar_color_hue   SMALLINT NOT NULL                     -- deterministic from full_name at create
created_at, updated_at, deleted_at
INDEX (department_id), INDEX (manager_id), INDEX (employment_status), INDEX (full_name)
```

### 5.3 `departments`
```
id, name VARCHAR(80) UNIQUE NOT NULL, created_at, updated_at
```

### 5.4 `refresh_tokens`
```
id             BIGINT UNSIGNED PK
user_id        BIGINT UNSIGNED NOT NULL FK→users.id ON DELETE CASCADE
family_id      CHAR(36) NOT NULL                -- UUID; shared across a rotation chain
token_hash     CHAR(64) NOT NULL UNIQUE         -- sha256(opaque token)
issued_at      DATETIME(3) NOT NULL
expires_at     DATETIME(3) NOT NULL
revoked_at     DATETIME(3) NULL
replaced_by_id BIGINT UNSIGNED NULL
user_agent     VARCHAR(255), ip VARCHAR(45)
INDEX (user_id), INDEX (family_id), INDEX (expires_at)
```

### 5.5 `invites`
```
id, employee_id FK→employees.id, email, role_to_assign ENUM(...),
token_hash CHAR(64) UNIQUE, expires_at DATETIME(3), accepted_at DATETIME(3) NULL,
created_by BIGINT UNSIGNED FK→users.id, created_at
INDEX (expires_at), INDEX (employee_id)
```
Default TTL 48h.

### 5.6 `password_resets`
```
id, user_id FK→users.id, token_hash CHAR(64) UNIQUE,
expires_at DATETIME(3), consumed_at DATETIME(3) NULL, created_at
INDEX (expires_at)
```
Default TTL 1h; single-use.

### 5.7 `login_attempts`
```
id, email VARCHAR(255), ip VARCHAR(45), succeeded BOOLEAN, created_at DATETIME(3)
INDEX (email, created_at), INDEX (ip, created_at)
```
Daily cleanup job purges rows older than 7 days.

### 5.8 `audit_log`
```
id, actor_user_id FK→users.id NULL, actor_ip VARCHAR(45),
action VARCHAR(64) NOT NULL,          -- e.g. 'employee.salary.update'
entity_type VARCHAR(32) NOT NULL,
entity_id BIGINT UNSIGNED NULL,
changes JSON NULL,                    -- {before, after}; salary redacted in list responses
created_at DATETIME(3) NOT NULL
INDEX (actor_user_id), INDEX (entity_type, entity_id), INDEX (created_at)
```
Write-only from app code. No UPDATE/DELETE paths.

### 5.9 Data-handling rules

- **All tokens stored as sha256(rawToken)** — never raw — so a DB leak does not yield usable tokens.
- **MFA secret encrypted at the app layer** with AES-256-GCM using the `MFA_ENCRYPTION_KEY` (32-byte random).
- **Salary** is stripped in the DTO mapper, not at the SQL layer. Every response path goes through the same mapper; accidental SELECTs cannot leak it.

## 6. API surface

All under `/api/...` (unversioned). JSON in/out. Uniform error body: `{ code, message, details? }` with appropriate HTTP status.

### 6.1 Auth
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | public | email+password → access JWT + refresh cookie; if MFA → `{ mfaRequired, mfaToken }` |
| POST | `/api/auth/mfa/verify` | mfaToken | TOTP code → tokens |
| POST | `/api/auth/refresh` | refresh cookie | rotates refresh, issues new access |
| POST | `/api/auth/logout` | refresh cookie | revokes family, clears cookie |
| GET  | `/api/auth/me` | access | current user + linked employee summary |
| POST | `/api/auth/password/forgot` | public | always 200; email sent iff address exists |
| POST | `/api/auth/password/reset` | public | `{ token, newPassword }` → rotates + revokes families |
| POST | `/api/auth/password/change` | access | `{ currentPassword, newPassword }`; clears `must_change_password` |

### 6.2 MFA enrollment
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/mfa/setup/start` | access | returns `{ secret, otpauthUrl }` |
| POST | `/api/auth/mfa/setup/confirm` | access | verify TOTP → flip `mfa_enabled`, store encrypted secret, issue 10 one-use recovery codes |
| POST | `/api/auth/mfa/disable` | access | `{ currentPassword, totp }` → disable |

### 6.3 Invites
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/invites` | admin, hr | `{ employeeId, role }` → issue + email |
| GET  | `/api/invites/:token` | public | validate; return `{ email, fullName }` |
| POST | `/api/invites/:token/accept` | public | `{ password }` → create/link user, auto-login |
| POST | `/api/invites/:id/resend` | admin, hr | rotate token + re-email |
| DELETE | `/api/invites/:id` | admin, hr | revoke pending invite |

### 6.4 Users
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET  | `/api/users` | admin | paginated |
| PATCH | `/api/users/:id` | admin | role/status; blocks demoting the last admin or disabling self |
| POST | `/api/users/:id/force-logout` | admin | revoke all refresh families |

### 6.5 Employees
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET  | `/api/employees` | any authed | `?q&department&status&page&pageSize&sort`; salary visibility per-row: admin/hr see all; manager sees salary only on their direct-report rows; employee sees salary only on their own row; otherwise the field is `null` |
| GET  | `/api/employees/:id` | any authed | detail; salary visibility = admin/hr ∨ manager-of-target ∨ self |
| POST | `/api/employees` | admin, hr | create (no user yet) |
| PATCH | `/api/employees/:id` | admin, hr | update; salary change requires `reason` (≥10 chars) + audit |
| DELETE | `/api/employees/:id` | admin | soft-delete; disables linked user; revokes refresh families |

Managers and employees have **no write routes** on employees in Phase 1 (write scopes like "manager updates report's non-sensitive fields" are deferred — no concrete use case in Phase 1; absence approvals arrive in Phase 2).

### 6.6 Departments
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET  | `/api/departments` | any authed | |
| POST/PATCH/DELETE | `/api/departments/...` | admin | DELETE blocked if referenced |

### 6.7 Audit
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/audit` | admin | filtered; salary amounts redacted for non-admin/hr |

### 6.8 Health
| GET | `/api/health` | public | `{ ok, db }` |

### 6.9 Response envelopes
- List: `{ data, page, pageSize, total }`
- Detail: resource object directly
- Mutation: updated resource, or `{ ok: true }`

### 6.10 Error codes (stable)
`INVALID_CREDENTIALS`, `MFA_REQUIRED`, `MFA_INVALID`, `TOKEN_EXPIRED`, `TOKEN_REUSED`, `INSUFFICIENT_ROLE`, `NOT_FOUND`, `VALIDATION_FAILED`, `RATE_LIMITED`, `EMAIL_TAKEN`, `INVITE_EXPIRED`, `INVITE_ALREADY_ACCEPTED`, `PASSWORD_TOO_WEAK`, `PASSWORD_PWNED`, `MUST_CHANGE_PASSWORD`.

## 7. Authorization (RBAC)

Roles are a closed enum; **enforcement references permissions, not role names**. Adding a future role is a config change in `ROLE_PERMISSIONS`, not a role-name hunt across the codebase (OCP).

```ts
type Role = 'admin' | 'hr' | 'manager' | 'employee';

type Permission =
  | 'employees:read:any'
  | 'employees:read:salary:any'
  | 'employees:read:self'
  | 'employees:read:salary:reports'
  | 'employees:write:any'
  | 'employees:write:salary'
  | 'users:read' | 'users:write'
  | 'invites:manage'
  | 'departments:manage'
  | 'audit:read';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['employees:read:any','employees:read:salary:any',
          'employees:write:any','employees:write:salary',
          'users:read','users:write','invites:manage',
          'departments:manage','audit:read'],
  hr:    ['employees:read:any','employees:read:salary:any',
          'employees:write:any','employees:write:salary',
          'invites:manage','departments:manage'],
  manager: ['employees:read:any',
            'employees:read:salary:reports',
            'employees:read:self'],
  employee: ['employees:read:any',
             'employees:read:self'],
};
```

### 7.1 Enforcement layers (defense in depth)

1. **Route**: `authorize('<permission>')` middleware performs the coarse role check.
2. **Service-layer scope**: for per-resource scope (self, direct-report, any), the service computes the relation and decides.
3. **DTO mapper**: salary is stripped in the mapper (one code path for list + detail + search).
4. **Write-scope guards**:
   - Role demotion blocked for the last admin (`SELECT ... FOR UPDATE` inside a transaction).
   - Self-disable blocked at service layer.
   - Salary change requires `employees:write:salary` + non-empty `reason` + audit row.

### 7.2 Client-side
`usePermissions().can(...)` mirrors the server map for UX gating only. **The backend remains the authority.**

### 7.3 Table-driven test
A supertest matrix exercises every route × role × (self / direct-report / other) combination and asserts the expected status + response shape.

## 8. Auth flows

### 8.1 Login (no MFA)
```
POST /auth/login { email, password }
  → rate-limit(email, ip)
  → fetch user; bcrypt.compare (dummy hash when email unknown, constant-time)
  → record login_attempt (success flag)
  → issue accessJwt (15m)
  → generate opaque refresh token (32B random); store sha256 + new family_id
  → 200 { accessToken, user }
    Set-Cookie: rt=...; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=30d
```

### 8.2 Login with MFA
```
POST /auth/login → 200 { mfaRequired: true, mfaToken }   // mfaToken: 5-min JWT, scope='mfa'
POST /auth/mfa/verify  (Bearer mfaToken, { code })
  → verify TOTP (±1 step); issue access + refresh
```

### 8.3 Silent refresh with rotation + reuse detection
```
POST /auth/refresh (cookie)
  → sha256(rt) → lookup row
  → if !row OR expired:               401
  → if row.revoked_at IS NOT NULL:    REUSE!
       revoke entire family_id
       audit 'auth.refresh.reuse'
       → 401 TOKEN_REUSED (forces re-login on both attacker & legitimate user)
  → else: rotate (insert new row, mark old replaced_by), issue new accessJwt
```

### 8.4 Logout
Revoke the caller's current refresh-token family; clear cookie; 204.

### 8.5 Invite → accept
```
POST /api/invites { employeeId, role }  (admin/hr)
  → generate rawToken (32B random); store sha256 in invites; TTL +48h
  → send email with link: APP_URL/invite/accept?token=<rawToken>

user opens link:
  FE  GET  /api/invites/:token           → { email, fullName }
  FE  POST /api/invites/:token/accept    → creates or links users row,
                                            marks invite accepted, auto-login,
                                            audit 'invite.accepted'
```

### 8.6 Password reset
```
POST /auth/password/forgot { email }
  → always 200 after constant-time ~200ms delay (no enumeration)
  → if user exists: row in password_resets (TTL 1h) + email

POST /auth/password/reset { token, newPassword }
  → consume token; rotate password; revoke ALL refresh families;
    audit 'user.password.reset'
```

### 8.7 Security-relevant specifics baked in
- Access token: HS256, 15m, claims `{ sub, role, iat, exp, jti }`. Signing key from `JWT_ACCESS_SECRET` (≥64 random bytes).
- Refresh token: opaque 32-byte random, never a JWT; stored only as sha256; cookie `HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=30d`; rotates on every use.
- Reuse detection is mandatory — silent refresh-token theft becomes a guaranteed re-login, surfacing the compromise.
- Clock skew tolerance: ±30s on JWT `exp`; TOTP window ±1 step (30s).
- Rate limits — `/auth/login`: 10/15min per email AND 30/15min per IP; `/auth/password/forgot`: 3/hr per email, 10/hr per IP; `/auth/refresh`: 60/min per IP; global: 300/min per IP. Exceeded → 429 + `Retry-After`.

## 9. Frontend

### 9.1 Routes
```
Public:  /login, /login/mfa, /invite/accept, /password/forgot, /password/reset
Protected (RequireAuth):
         /  → redirect /employees
         /employees          (drawer state in URL: ?selected=<id>&add=1)
         /employees/:id      (deep-link drawer)
Admin/HR-gated:
         /settings/users
         /settings/departments
         /settings/audit (admin)
         /settings/security  (MFA + password change; everyone)
Other prototype views (overview/absence/payroll/benefits/recruiting):
         "Coming in Phase N" placeholder; sidebar preserved.
```

### 9.2 Axios interceptor
```
on 401 TOKEN_EXPIRED:
  pause outgoing requests → POST /auth/refresh → replay queue
  on TOKEN_REUSED / network fail → clear store, redirect /login?reason=session_expired
on 403 INSUFFICIENT_ROLE: toast; no retry
on 429 RATE_LIMITED: exponential backoff honoring Retry-After
```

### 9.3 Server state
TanStack Query. Keys: `['employees', filters]`, `['employee', id]`, `['me']`, `['users', ...]`, `['departments']`, `['auditLog', filters]`. Optimistic updates for employee edits with rollback on error.

### 9.4 Client state
Zustand for auth (`accessToken`, `user`, `login`, `logout`) and UI (`theme`, `accent`, `lang`, `sidebarCollapsed`, `tweaksOpen`).

### 9.5 Tailwind design tokens
Port prototype palette into `tailwind.config.js`:
```
colors:
  ink: '#1E1B16'
  parchment: '#FBF8F3'
  accent: 'var(--accent)'    // runtime-switched
  sage: 'oklch(0.70 0.09 150)'
  terracotta: 'oklch(0.66 0.13 40)'
  plum: 'oklch(0.60 0.10 320)'
  sky: 'oklch(0.72 0.08 230)'
fontFamily:
  display: ['"Instrument Serif"', 'serif']
  sans:    ['Inter', 'system-ui', 'sans-serif']
borderRadius: 14–20px scale
```
Accent is a CSS variable swapped at runtime (matches prototype Tweaks panel behavior).

### 9.6 i18n
i18next with the same catalog keys as `components/i18n.jsx`. Default locale `id`. Stored per-user in `users.language`; UI switch in Tweaks panel persists via `/api/users/:id`.

## 10. Security posture (consolidated)

Non-negotiable, captured as requirements for the implementation plan.

- **Transport**: HTTPS only; HSTS in prod; strict CSP (`default-src 'self'`, no `unsafe-inline`); frame-ancestors none; no-sniff; strict-origin referrer.
- **CORS**: allowlist from `WEB_ORIGIN`; credentials true.
- **Passwords**: bcrypt cost 12; min 10 chars; Pwned Passwords (HIBP k-anonymity or local list); no forced rotation; no composition rules; progressive delay + 15-min lock after 10 failures in 15 min per account.
- **MFA**: TOTP RFC 6238; secret AES-256-GCM encrypted; required for admin/hr; 10 single-use recovery codes (bcrypt-stored).
- **Tokens**: all stored as sha256(raw); never logged.
- **Refresh cookie**: HttpOnly/Secure/SameSite=Strict/Path=/api/auth; rotated; reuse → family revoke.
- **Input**: zod `.strict()` on every request; 100KB JSON limit; Drizzle only, no raw SQL beyond migrations.
- **Rate limiting**: as in §8.7 — in-memory for Phase 1; Redis store when/if multi-instance.
- **Secrets**: env only; `.env.example` is the shipped template; boot-time assertions (required vars, key length) refuse to start on misconfiguration.
- **Initial admin**: seeded once from env; `must_change_password=true`; env ceases to be authoritative after first login.
- **Audit log**: write-only from app code.
- **Error handling**: prod responses never include stack traces; `X-Request-Id` echoed.
- **Logging**: pino JSON; redacted fields: `password`, `token`, `authorization`, `cookie`, `salary_amount`, `mfa_secret`.
- **Timing**: constant-time login (dummy bcrypt on unknown email); constant-time `password/forgot`.
- **Deps**: `pnpm audit` in CI fails on high/critical.

### 10.1 Out-of-scope for Phase 1 (explicit)
SSO/SAML, OAuth social login, IP allowlisting, device fingerprinting, risk-based auth, WAF/CDN rules, SOC2 evidence, encrypted backups (documented procedure only).

## 11. Testing strategy

### 11.1 Backend
- **Vitest unit**: pure service logic; repos mocked via interface.
- **Supertest integration**: real MySQL schema per test file (fresh DB via `beforeAll`/`afterAll`); hit Express via supertest.
- **TDD strict on**: `modules/auth/*`, `shared/middlewares/authorize`, any endpoint writing to `audit_log`, any service handling `salary_amount`. Test first, code second.
- **Table-driven permission matrix** (§7.3) runs as an integration suite.
- **Coverage target**: >90% on auth + permissions code; no gate elsewhere (coverage-as-number is a weak goal outside RBAC).

### 11.2 Frontend
Manual in Phase 1. Post-launch: single Playwright smoke (login → add employee → verify appears).

## 12. Development environment

```
# One-time
brew install mysql@8.0 && brew services start mysql@8.0
mysql -u root -e "CREATE DATABASE naratala CHARACTER SET utf8mb4;
                  CREATE USER 'naratala'@'localhost' IDENTIFIED BY 'dev';
                  GRANT ALL ON naratala.* TO 'naratala'@'localhost';"
docker run -d --name mailhog -p 1025:1025 -p 8025:8025 mailhog/mailhog
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm --filter api db:migrate
pnpm --filter api db:seed          # departments + initial admin (+ dev employees if SEED_DEV_DATA=true)

# Daily
pnpm dev    # runs web (5173) + api (3000) concurrently
```

- API: `tsx watch` + `pino-pretty`.
- Web: Vite with `/api` proxy to `http://localhost:3000`.
- Mail inbox: `http://localhost:8025`.

## 13. Migrations and seed

`drizzle-kit` generates SQL migrations under `apps/api/src/db/migrations/`. CI fails if working-tree schema diverges from the latest migration output.

Seed script split into idempotent steps:
- `seedDepartments()` — inserts the prototype's 7 departments if absent.
- `seedAdmin()` — inserts only when `users` is empty; reads `INITIAL_ADMIN_EMAIL`/`INITIAL_ADMIN_PASSWORD`; sets `must_change_password=true`.
- `seedDevEmployees()` — gated by `SEED_DEV_DATA=true`; inserts the 15 prototype employees with deterministic avatar hues.

## 14. Environment variables

**Frontend** (`apps/web/.env.example`):
```
VITE_API_BASE_URL=http://localhost:3000
```

**Backend** (`apps/api/.env.example`):
```
NODE_ENV=development
PORT=3000
WEB_ORIGIN=http://localhost:5173

DATABASE_URL=mysql://naratala:dev@127.0.0.1:3306/naratala

JWT_ACCESS_SECRET=              # 64+ random bytes, base64; asserted on boot (≥64B)
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d

MFA_ENCRYPTION_KEY=             # 32-byte base64; AES-GCM key; asserted on boot

SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
MAIL_FROM="Naratala HRIS <no-reply@naratala.local>"

INITIAL_ADMIN_EMAIL=admin@naratala.local
INITIAL_ADMIN_PASSWORD=         # ≥12 chars; consumed on first boot

LOG_LEVEL=debug
SEED_DEV_DATA=true
```

## 15. CI

Pipeline jobs (GitHub Actions or similar), all must pass:
- `lint` — eslint + prettier --check + typecheck (both apps + shared).
- `test` — mysql:8.0 service + mailhog service; run API unit + integration suites.
- `build` — `pnpm -r build`.
- `audit` — `pnpm audit --prod`; fails on high/critical.

## 16. Deployment (minimal, Phase 1)

- API: single Node process (`node dist/server.js`) behind Nginx or Caddy (TLS termination).
- Web: `vite build` → static assets served by the same reverse proxy.
- DB: managed MySQL 8.0 or self-hosted with daily encrypted backups (procedure documented).
- Process mgmt: systemd unit or PM2 (both documented).
- Observability Phase 1: pino JSON logs to stdout → captured by the host. Metrics/traces deferred.

Production host, domain, and TLS source are intentionally deferred — they do not affect code and can be finalized at deploy time.

## 17. SOLID mapping

- **SRP** — each feature module owns one aggregate (auth / users / employees / departments / audit).
- **OCP** — adding a module = adding a folder under `modules/`; adding a role = adding an entry in `ROLE_PERMISSIONS`. No central router or role-name grep required.
- **LSP / ISP** — services depend on repository interfaces; narrow interfaces per service (no fat repos).
- **DIP** — controllers depend on service interfaces; infrastructure (DB, mail, JWT) is wired in `bootstrap/`; tests substitute fakes without touching callers.

## 18. Open items (flagged for the plan stage, not blocking)

- Encrypted backups: procedure to be written; not implemented in Phase 1.
- Production host / domain / TLS source.
- Email sender identity (once a real domain exists).
- Language column naming if additional locales are added later (current enum is `('id','en')`).

## 19. Reference: prototype files

- Entry: `index.html` (installed at project root from the Claude Design handoff).
- Components: `components/{icons,data,i18n,shell,absence,employees,other-views}.jsx`.
- Styles: `styles.css` (source of design tokens).
- Design bundle README: `/tmp/naratala-design/hris-app/README.md`.
- Chat transcript (intent): `/tmp/naratala-design/hris-app/chats/chat1.md`.
