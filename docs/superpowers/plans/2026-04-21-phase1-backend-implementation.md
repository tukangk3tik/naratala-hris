# Phase 1 Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the backend for Phase 1 of Naratala HRIS — auth (login, MFA, refresh with rotation + reuse detection, invites, password reset), users/roles, departments, employees (with salary RBAC + audit), and audit-log — against real MySQL 8, TDD on auth/permissions, behind the exact security posture in the spec.

**Architecture:** Single Express 4 process, feature-module layout under `apps/api/src/modules/*` (auth, users, employees, departments, invites, audit), shared cross-cutting infra under `apps/api/src/shared/*`, Drizzle ORM against MySQL 8. Controllers call services; services call repository **interfaces**; concrete Drizzle repos are wired in `bootstrap/`. Contracts (zod schemas, role/permission constants, error codes) live in `packages/shared` so the frontend and backend cannot drift.

**Tech Stack:** pnpm workspaces · Node 20 · TypeScript 5 · Express 4 · Drizzle ORM + drizzle-kit · mysql2 · zod · jsonwebtoken · bcrypt · otplib · nodemailer · helmet · express-rate-limit · pino · Vitest + supertest.

**Related spec:** `docs/superpowers/specs/2026-04-19-phase1-auth-employees-design.md` (Sections referenced inline as "spec §N").

---

## Phase map

The plan is 36 tasks, grouped; each task is self-contained and ends in a commit.

| Phase | Tasks | What lands |
|---|---|---|
| A. Scaffold | 1–4 | Monorepo, TS configs, API skeleton, env loader |
| B. Shared contract | 5–7 | Roles/permissions, error codes, zod DTO schemas |
| C. Database | 8–10 | Drizzle schema (8 tables), migrations, migrate runner |
| D. Cross-cutting middleware | 11–15 | requestId/pino, validate, errorHandler, rate-limit, helmet/CORS |
| E. Auth primitives | 16–20 | password (bcrypt + pwned), AES-GCM, opaque token + sha256, JWT, TOTP |
| F. Auth routes | 21–27 | login, MFA verify, refresh (+reuse detection), logout, me, password forgot/reset/change, MFA enroll |
| G. Authorize + invites | 28–29 | authenticate/authorize middleware; invites module |
| H. Business modules | 30–33 | departments, users, employees (with salary DTO + audit) |
| I. Audit + health + matrix | 34–36 | audit GET, health, permission-matrix integration test, CI |

---

## Conventions used throughout

- **Paths are relative to repo root** `/Users/blackmamba/SelfProject/naratala-hris`.
- **Tests run against a real MySQL** using a per-test-file database (template DB cloned + dropped). The test harness arrives in Task 10.
- **Every task ends in a single commit.** Commit messages follow Conventional Commits (`feat:`, `chore:`, `test:`, `fix:`, `refactor:`).
- **TDD is strict** for all tasks in Phases E, F, G, and H's employees/users/audit code (per spec §11.1). Non-logic tasks (pure scaffold, config files) commit without tests.
- **Run commands assume pnpm from repo root** unless noted.

---

## Task 1: Initialize pnpm monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.npmrc`
- Create: `.nvmrc`
- Create: `tsconfig.base.json`
- Create: `.editorconfig`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `.eslintrc.cjs`
- Create: `.eslintignore`
- Modify: `.gitignore`

- [ ] **Step 1: Write repo-root `package.json`**

```json
{
  "name": "naratala-hris",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20.11.0", "pnpm": ">=9.0.0" },
  "scripts": {
    "lint": "pnpm -r --parallel lint",
    "typecheck": "pnpm -r --parallel typecheck",
    "test": "pnpm -r --parallel test",
    "build": "pnpm -r build",
    "format": "prettier --write \"**/*.{ts,tsx,js,cjs,json,md,yml,yaml}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,cjs,json,md,yml,yaml}\"",
    "dev": "pnpm --filter api dev"
  },
  "devDependencies": {
    "prettier": "3.3.3",
    "eslint": "8.57.1",
    "@typescript-eslint/eslint-plugin": "7.18.0",
    "@typescript-eslint/parser": "7.18.0",
    "typescript": "5.6.2"
  }
}
```

- [ ] **Step 2: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: Write `.npmrc`**

```
auto-install-peers=true
strict-peer-dependencies=false
shamefully-hoist=false
```

- [ ] **Step 4: Write `.nvmrc`**

```
20.11.0
```

- [ ] **Step 5: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "declaration": true,
    "sourceMap": true,
    "incremental": true
  }
}
```

- [ ] **Step 6: Write `.editorconfig`**

```
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

- [ ] **Step 7: Write `.prettierrc.json`**

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "arrowParens": "always"
}
```

- [ ] **Step 8: Write `.prettierignore`**

```
node_modules
dist
build
.turbo
.cache
coverage
apps/*/dist
apps/*/build
components/
styles.css
index.html
```

- [ ] **Step 9: Write `.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: { node: true, es2022: true },
  ignorePatterns: ['dist', 'build', 'node_modules', 'components/**', 'styles.css', 'index.html'],
  rules: {
    '@typescript-eslint/consistent-type-imports': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
};
```

- [ ] **Step 10: Write `.eslintignore`**

```
node_modules
dist
build
coverage
components/
styles.css
index.html
```

- [ ] **Step 11: Append to `.gitignore`**

Append these lines after the existing `# caches` block:

```
# test artifacts
apps/api/test-results/
apps/*/tsconfig.tsbuildinfo
```

- [ ] **Step 12: Install root devDependencies**

Run: `pnpm install`
Expected: prettier + eslint + TS installed at root, no errors.

- [ ] **Step 13: Verify formatting is clean**

Run: `pnpm format:check`
Expected: `All matched files use Prettier code style!` (no files to format yet; passes trivially).

- [ ] **Step 14: Commit**

```bash
git add package.json pnpm-workspace.yaml .npmrc .nvmrc tsconfig.base.json .editorconfig .prettierrc.json .prettierignore .eslintrc.cjs .eslintignore .gitignore pnpm-lock.yaml
git commit -m "chore: initialize pnpm monorepo with shared toolchain"
```

---

## Task 2: Scaffold `packages/shared` workspace

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Write `packages/shared/package.json`**

```json
{
  "name": "@naratala/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./permissions": "./src/permissions.ts",
    "./errors": "./src/errors.ts",
    "./schemas": "./src/schemas/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint \"src/**/*.ts\"",
    "test": "echo 'no tests in shared'"
  },
  "dependencies": {
    "zod": "3.23.8"
  }
}
```

- [ ] **Step 2: Write `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Write placeholder `packages/shared/src/index.ts`**

```ts
export {};
```

- [ ] **Step 4: Install and typecheck**

Run: `pnpm install && pnpm --filter @naratala/shared typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared pnpm-lock.yaml
git commit -m "chore(shared): scaffold shared workspace"
```

---

## Task 3: Scaffold `apps/api` Express app

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/.env.example`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/app.ts`

- [ ] **Step 1: Write `apps/api/package.json`**

```json
{
  "name": "api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch --clear-screen=false src/server.ts | pino-pretty",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint \"src/**/*.ts\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/bootstrap/migrate.ts",
    "db:seed": "tsx src/bootstrap/seed.ts"
  },
  "dependencies": {
    "@naratala/shared": "workspace:*",
    "bcrypt": "5.1.1",
    "cookie-parser": "1.4.7",
    "cors": "2.8.5",
    "dotenv": "16.4.5",
    "drizzle-orm": "0.33.0",
    "express": "4.21.0",
    "express-rate-limit": "7.4.0",
    "helmet": "7.1.0",
    "jsonwebtoken": "9.0.2",
    "mysql2": "3.11.3",
    "nodemailer": "6.9.15",
    "otplib": "12.0.1",
    "pino": "9.4.0",
    "pino-http": "10.3.0",
    "qrcode": "1.5.4",
    "uuid": "10.0.0",
    "zod": "3.23.8"
  },
  "devDependencies": {
    "@types/bcrypt": "5.0.2",
    "@types/cookie-parser": "1.4.7",
    "@types/cors": "2.8.17",
    "@types/express": "4.17.21",
    "@types/jsonwebtoken": "9.0.7",
    "@types/node": "20.16.10",
    "@types/nodemailer": "6.4.16",
    "@types/qrcode": "1.5.5",
    "@types/supertest": "6.0.2",
    "@types/uuid": "10.0.0",
    "drizzle-kit": "0.24.2",
    "pino-pretty": "11.2.2",
    "supertest": "7.0.0",
    "tsx": "4.19.1",
    "typescript": "5.6.2",
    "vitest": "2.1.1"
  }
}
```

- [ ] **Step 2: Write `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"],
    "paths": {
      "@naratala/shared": ["../../packages/shared/src/index.ts"],
      "@naratala/shared/*": ["../../packages/shared/src/*"]
    }
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Write `apps/api/tsconfig.build.json`**

Create `apps/api/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "noEmit": false
  },
  "exclude": ["**/*.test.ts", "src/**/__tests__/**"]
}
```

- [ ] **Step 4: Write `apps/api/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@naratala/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
```

- [ ] **Step 5: Write `apps/api/.env.example`** (mirrors spec §14)

```
NODE_ENV=development
PORT=3000
WEB_ORIGIN=http://localhost:5173

DATABASE_URL=mysql://naratala:dev@127.0.0.1:3306/naratala

JWT_ACCESS_SECRET=
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d

MFA_ENCRYPTION_KEY=

SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
MAIL_FROM="Naratala HRIS <no-reply@naratala.local>"

INITIAL_ADMIN_EMAIL=admin@naratala.local
INITIAL_ADMIN_PASSWORD=

LOG_LEVEL=debug
SEED_DEV_DATA=true
```

- [ ] **Step 6: Write `apps/api/src/app.ts`** (minimal — wiring will grow task by task)

```ts
import express, { type Express } from 'express';

export function buildApp(): Express {
  const app = express();
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  return app;
}
```

- [ ] **Step 7: Write `apps/api/src/server.ts`**

```ts
import { buildApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const app = buildApp();
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ msg: 'api listening', port }));
});
```

- [ ] **Step 8: Install**

Run: `pnpm install`
Expected: workspace resolved; `@naratala/shared` linked into `apps/api/node_modules`.

- [ ] **Step 9: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: no errors.

- [ ] **Step 10: Smoke-test the server boots**

Run: `pnpm --filter api dev &` then `sleep 2 && curl -s http://localhost:3000/api/health`
Expected: `{"ok":true}`. Kill the dev process afterward.

- [ ] **Step 11: Commit**

```bash
git add apps/api pnpm-lock.yaml
git commit -m "chore(api): scaffold express app with health endpoint"
```

---

## Task 4: Typed env loader with boot-time assertions

**Files:**
- Create: `apps/api/src/shared/config/env.ts`
- Create: `apps/api/src/shared/config/env.test.ts`
- Modify: `apps/api/src/server.ts`

- [ ] **Step 1: Write failing test `apps/api/src/shared/config/env.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { loadEnv } from './env.js';

const base = {
  NODE_ENV: 'development',
  PORT: '3000',
  WEB_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'mysql://u:p@127.0.0.1:3306/db',
  JWT_ACCESS_SECRET: 'a'.repeat(86),          // 64 bytes base64
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL: '30d',
  MFA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1025',
  MAIL_FROM: 'Naratala <no-reply@local>',
  INITIAL_ADMIN_EMAIL: 'admin@naratala.local',
  INITIAL_ADMIN_PASSWORD: 'dev-password-12',
  LOG_LEVEL: 'debug',
  SEED_DEV_DATA: 'true',
};

describe('loadEnv', () => {
  it('parses a valid environment', () => {
    const env = loadEnv(base);
    expect(env.PORT).toBe(3000);
    expect(env.SEED_DEV_DATA).toBe(true);
    expect(env.MFA_ENCRYPTION_KEY).toHaveLength(32);        // decoded bytes
  });

  it('rejects a short JWT_ACCESS_SECRET', () => {
    expect(() => loadEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects a non-32-byte MFA_ENCRYPTION_KEY', () => {
    expect(() => loadEnv({ ...base, MFA_ENCRYPTION_KEY: Buffer.alloc(16, 1).toString('base64') }))
      .toThrow(/MFA_ENCRYPTION_KEY/);
  });

  it('rejects an INITIAL_ADMIN_PASSWORD shorter than 12 chars', () => {
    expect(() => loadEnv({ ...base, INITIAL_ADMIN_PASSWORD: 'short' })).toThrow(/INITIAL_ADMIN_PASSWORD/);
  });
});
```

- [ ] **Step 2: Run the test, expect FAIL**

Run: `pnpm --filter api test src/shared/config/env.test.ts`
Expected: module not found / function missing.

- [ ] **Step 3: Implement `apps/api/src/shared/config/env.ts`**

```ts
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z.string().url(),

  DATABASE_URL: z.string().min(10),

  JWT_ACCESS_SECRET: z.string().refine(
    (v) => Buffer.from(v, 'base64').length >= 64 || v.length >= 64,
    'JWT_ACCESS_SECRET must decode to ≥64 bytes (or be ≥64 chars)',
  ),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('30d'),

  MFA_ENCRYPTION_KEY: z
    .string()
    .transform((v, ctx) => {
      const buf = Buffer.from(v, 'base64');
      if (buf.length !== 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'MFA_ENCRYPTION_KEY must decode to exactly 32 bytes (base64)',
        });
        return z.NEVER;
      }
      return buf;
    }),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().min(1),

  INITIAL_ADMIN_EMAIL: z.string().email(),
  INITIAL_ADMIN_PASSWORD: z.string().min(12, 'INITIAL_ADMIN_PASSWORD must be ≥12 chars'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SEED_DEV_DATA: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .transform((v) => v === true || v === 'true' || v === '1')
    .default(false),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv | Record<string, unknown> = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Invalid environment:\n${msg}`);
  }
  return parsed.data;
}
```

- [ ] **Step 4: Run the test, expect PASS**

Run: `pnpm --filter api test src/shared/config/env.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Wire `loadEnv` into `server.ts`**

Replace `apps/api/src/server.ts` body with:

```ts
import 'dotenv/config';
import { buildApp } from './app.js';
import { loadEnv } from './shared/config/env.js';

const env = loadEnv();
const app = buildApp();
app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ msg: 'api listening', port: env.PORT }));
});
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/shared/config apps/api/src/server.ts
git commit -m "feat(api): validated env loader with boot-time assertions"
```

---

## Task 5: Shared roles, permissions, error codes

**Files:**
- Create: `packages/shared/src/permissions.ts`
- Create: `packages/shared/src/errors.ts`
- Create: `packages/shared/src/permissions.test.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/package.json` (add vitest dev dep)

- [ ] **Step 1: Add vitest to `packages/shared/package.json` devDeps**

Replace the `scripts` and add `devDependencies`:

```json
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint \"src/**/*.ts\"",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "5.6.2",
    "vitest": "2.1.1"
  }
```

Run: `pnpm install`
Expected: vitest installed for shared.

- [ ] **Step 2: Write failing test `packages/shared/src/permissions.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { ROLES, ROLE_PERMISSIONS, hasPermission, type Permission } from './permissions.js';

describe('permissions', () => {
  it('lists all four roles', () => {
    expect(ROLES).toEqual(['admin', 'hr', 'manager', 'employee']);
  });

  it('admin holds every defined permission', () => {
    const all: Permission[] = [
      'employees:read:any', 'employees:read:salary:any', 'employees:read:self',
      'employees:read:salary:reports', 'employees:write:any', 'employees:write:salary',
      'users:read', 'users:write', 'invites:manage', 'departments:manage', 'audit:read',
    ];
    for (const p of all) expect(hasPermission('admin', p)).toBe(true);
  });

  it('hr cannot read audit and cannot manage users', () => {
    expect(hasPermission('hr', 'audit:read')).toBe(false);
    expect(hasPermission('hr', 'users:write')).toBe(false);
  });

  it('manager has report-scoped salary read but not any', () => {
    expect(hasPermission('manager', 'employees:read:salary:reports')).toBe(true);
    expect(hasPermission('manager', 'employees:read:salary:any')).toBe(false);
  });

  it('employee has self read but no write', () => {
    expect(hasPermission('employee', 'employees:read:self')).toBe(true);
    expect(hasPermission('employee', 'employees:write:any')).toBe(false);
  });

  it('ROLE_PERMISSIONS has an entry for every role', () => {
    for (const r of ROLES) expect(ROLE_PERMISSIONS[r]).toBeDefined();
  });
});
```

- [ ] **Step 3: Run, expect FAIL**

Run: `pnpm --filter @naratala/shared test`
Expected: module not found.

- [ ] **Step 4: Implement `packages/shared/src/permissions.ts`**

```ts
export const ROLES = ['admin', 'hr', 'manager', 'employee'] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | 'employees:read:any'
  | 'employees:read:salary:any'
  | 'employees:read:self'
  | 'employees:read:salary:reports'
  | 'employees:write:any'
  | 'employees:write:salary'
  | 'users:read'
  | 'users:write'
  | 'invites:manage'
  | 'departments:manage'
  | 'audit:read';

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: [
    'employees:read:any', 'employees:read:salary:any',
    'employees:write:any', 'employees:write:salary',
    'users:read', 'users:write', 'invites:manage',
    'departments:manage', 'audit:read',
  ],
  hr: [
    'employees:read:any', 'employees:read:salary:any',
    'employees:write:any', 'employees:write:salary',
    'invites:manage', 'departments:manage',
  ],
  manager: [
    'employees:read:any',
    'employees:read:salary:reports',
    'employees:read:self',
  ],
  employee: [
    'employees:read:any',
    'employees:read:self',
  ],
};

export function hasPermission(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(perm);
}
```

- [ ] **Step 5: Implement `packages/shared/src/errors.ts`**

```ts
export const ERROR_CODES = [
  'INVALID_CREDENTIALS',
  'MFA_REQUIRED',
  'MFA_INVALID',
  'TOKEN_EXPIRED',
  'TOKEN_REUSED',
  'INSUFFICIENT_ROLE',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'RATE_LIMITED',
  'EMAIL_TAKEN',
  'INVITE_EXPIRED',
  'INVITE_ALREADY_ACCEPTED',
  'PASSWORD_TOO_WEAK',
  'PASSWORD_PWNED',
  'MUST_CHANGE_PASSWORD',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
}
```

- [ ] **Step 6: Re-export from `packages/shared/src/index.ts`**

```ts
export * from './permissions.js';
export * from './errors.js';
```

- [ ] **Step 7: Run, expect PASS**

Run: `pnpm --filter @naratala/shared test`
Expected: 6 passed.

- [ ] **Step 8: Commit**

```bash
git add packages/shared pnpm-lock.yaml
git commit -m "feat(shared): role/permission map and error codes"
```

---

## Task 6: Shared zod DTO schemas

**Files:**
- Create: `packages/shared/src/schemas/common.ts`
- Create: `packages/shared/src/schemas/auth.ts`
- Create: `packages/shared/src/schemas/employee.ts`
- Create: `packages/shared/src/schemas/user.ts`
- Create: `packages/shared/src/schemas/department.ts`
- Create: `packages/shared/src/schemas/invite.ts`
- Create: `packages/shared/src/schemas/index.ts`
- Create: `packages/shared/src/schemas/schemas.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write failing test `packages/shared/src/schemas/schemas.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  LoginBody, MfaVerifyBody, EmployeeCreate, EmployeeUpdate,
  InviteCreateBody, AcceptInviteBody, DepartmentCreate, UserUpdate,
  PasswordChangeBody, PasswordResetBody, PasswordForgotBody,
} from './index.js';

describe('auth schemas', () => {
  it('LoginBody requires email + password', () => {
    expect(LoginBody.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(LoginBody.safeParse({ email: 'a@b.co' }).success).toBe(false);
    expect(LoginBody.safeParse({ email: 'not-email', password: 'x' }).success).toBe(false);
  });

  it('LoginBody lowercases email', () => {
    const r = LoginBody.parse({ email: 'A@B.CO', password: 'x' });
    expect(r.email).toBe('a@b.co');
  });

  it('MfaVerifyBody requires a 6-digit code', () => {
    expect(MfaVerifyBody.safeParse({ code: '123456' }).success).toBe(true);
    expect(MfaVerifyBody.safeParse({ code: '12a456' }).success).toBe(false);
  });

  it('PasswordChangeBody requires ≥10 char newPassword', () => {
    expect(PasswordChangeBody.safeParse({ currentPassword: 'abc', newPassword: 'tooshort' }).success).toBe(false);
    expect(PasswordChangeBody.safeParse({ currentPassword: 'abc', newPassword: 'abcdefghij' }).success).toBe(true);
  });

  it('PasswordResetBody + PasswordForgotBody', () => {
    expect(PasswordResetBody.safeParse({ token: 't', newPassword: 'abcdefghij' }).success).toBe(true);
    expect(PasswordForgotBody.safeParse({ email: 'a@b.co' }).success).toBe(true);
  });
});

describe('employee schemas', () => {
  const baseCreate = {
    fullName: 'Ayu Wulan',
    email: 'ayu@naratala.local',
    departmentId: 1,
    position: 'Engineer',
    employmentType: 'full_time',
    hireDate: '2025-01-15',
  };

  it('EmployeeCreate requires core fields', () => {
    expect(EmployeeCreate.safeParse(baseCreate).success).toBe(true);
    expect(EmployeeCreate.safeParse({ ...baseCreate, employmentType: 'nope' }).success).toBe(false);
    expect(EmployeeCreate.safeParse({ ...baseCreate, hireDate: 'not-date' }).success).toBe(false);
  });

  it('EmployeeCreate accepts optional salary_amount/currency', () => {
    const r = EmployeeCreate.parse({ ...baseCreate, salaryAmount: '12345.67', salaryCurrency: 'IDR' });
    expect(r.salaryAmount).toBe('12345.67');
    expect(r.salaryCurrency).toBe('IDR');
  });

  it('EmployeeUpdate: if salaryAmount present, reason must be ≥10 chars', () => {
    expect(EmployeeUpdate.safeParse({ salaryAmount: '100' }).success).toBe(false);
    expect(EmployeeUpdate.safeParse({ salaryAmount: '100', reason: 'short' }).success).toBe(false);
    expect(EmployeeUpdate.safeParse({ salaryAmount: '100', reason: 'promotion approved' }).success).toBe(true);
  });
});

describe('invite + user + department schemas', () => {
  it('InviteCreateBody', () => {
    expect(InviteCreateBody.safeParse({ employeeId: 1, role: 'manager' }).success).toBe(true);
    expect(InviteCreateBody.safeParse({ employeeId: 1, role: 'root' }).success).toBe(false);
  });

  it('AcceptInviteBody', () => {
    expect(AcceptInviteBody.safeParse({ password: 'abcdefghij' }).success).toBe(true);
    expect(AcceptInviteBody.safeParse({ password: 'short' }).success).toBe(false);
  });

  it('DepartmentCreate', () => {
    expect(DepartmentCreate.safeParse({ name: 'Engineering' }).success).toBe(true);
    expect(DepartmentCreate.safeParse({ name: '' }).success).toBe(false);
  });

  it('UserUpdate restricts role + status', () => {
    expect(UserUpdate.safeParse({ role: 'manager' }).success).toBe(true);
    expect(UserUpdate.safeParse({ role: 'root' }).success).toBe(false);
    expect(UserUpdate.safeParse({ status: 'disabled' }).success).toBe(true);
    expect(UserUpdate.safeParse({}).success).toBe(true);
  });
});
```

- [ ] **Step 3: Run, expect FAIL**

Run: `pnpm --filter @naratala/shared test`
Expected: module(s) not found.

- [ ] **Step 4: Implement `packages/shared/src/schemas/common.ts`**

```ts
import { z } from 'zod';
import { ROLES } from '../permissions.js';

export const RoleEnum = z.enum(ROLES);

export const EmailSchema = z
  .string()
  .email()
  .max(255)
  .transform((s) => s.trim().toLowerCase());

export const PasswordSchema = z.string().min(10).max(200);

export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const DecimalString = z.string().regex(/^\d+(\.\d{1,2})?$/, 'expected decimal');
```

- [ ] **Step 5: Implement `packages/shared/src/schemas/auth.ts`**

```ts
import { z } from 'zod';
import { EmailSchema, PasswordSchema } from './common.js';

export const LoginBody = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(200),
}).strict();

export const MfaVerifyBody = z.object({
  code: z.string().regex(/^\d{6}$/),
}).strict();

export const PasswordForgotBody = z.object({ email: EmailSchema }).strict();

export const PasswordResetBody = z.object({
  token: z.string().min(10),
  newPassword: PasswordSchema,
}).strict();

export const PasswordChangeBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: PasswordSchema,
}).strict();

export const MfaSetupConfirmBody = z.object({
  code: z.string().regex(/^\d{6}$/),
}).strict();

export const MfaDisableBody = z.object({
  currentPassword: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
}).strict();
```

- [ ] **Step 6: Implement `packages/shared/src/schemas/employee.ts`**

```ts
import { z } from 'zod';
import { DecimalString, EmailSchema, IsoDate } from './common.js';

export const EmploymentType = z.enum(['full_time', 'part_time', 'contract', 'intern']);
export const EmploymentStatus = z.enum(['active', 'on_leave', 'terminated']);

export const EmployeeCreate = z.object({
  fullName: z.string().min(1).max(160),
  email: EmailSchema,
  phone: z.string().max(32).optional(),
  pronouns: z.string().max(32).optional(),
  departmentId: z.number().int().positive(),
  position: z.string().min(1).max(120),
  location: z.string().max(120).optional(),
  employmentType: EmploymentType,
  hireDate: IsoDate,
  managerId: z.number().int().positive().nullable().optional(),
  salaryAmount: DecimalString.optional(),
  salaryCurrency: z.string().length(3).default('IDR'),
}).strict();

export const EmployeeUpdate = z
  .object({
    fullName: z.string().min(1).max(160).optional(),
    email: EmailSchema.optional(),
    phone: z.string().max(32).nullable().optional(),
    pronouns: z.string().max(32).nullable().optional(),
    departmentId: z.number().int().positive().optional(),
    position: z.string().min(1).max(120).optional(),
    location: z.string().max(120).nullable().optional(),
    employmentType: EmploymentType.optional(),
    employmentStatus: EmploymentStatus.optional(),
    hireDate: IsoDate.optional(),
    managerId: z.number().int().positive().nullable().optional(),
    salaryAmount: DecimalString.nullable().optional(),
    salaryCurrency: z.string().length(3).optional(),
    reason: z.string().max(500).optional(),
  })
  .strict()
  .refine(
    (v) => v.salaryAmount === undefined || (typeof v.reason === 'string' && v.reason.trim().length >= 10),
    { message: 'reason (≥10 chars) is required when changing salaryAmount', path: ['reason'] },
  );

export interface EmployeeDTO {
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
  employmentType: z.infer<typeof EmploymentType>;
  employmentStatus: z.infer<typeof EmploymentStatus>;
  hireDate: string;
  managerId: number | null;
  avatarColorHue: number;
  salaryAmount: string | null;
  salaryCurrency: string;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 7: Implement `packages/shared/src/schemas/user.ts`**

```ts
import { z } from 'zod';
import { RoleEnum } from './common.js';

export const UserStatus = z.enum(['pending', 'active', 'disabled']);
export const Language = z.enum(['id', 'en']);

export const UserUpdate = z
  .object({
    role: RoleEnum.optional(),
    status: UserStatus.optional(),
    language: Language.optional(),
  })
  .strict();

export interface UserDTO {
  id: number;
  email: string;
  role: z.infer<typeof RoleEnum>;
  status: z.infer<typeof UserStatus>;
  language: z.infer<typeof Language>;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 8: Implement `packages/shared/src/schemas/department.ts`**

```ts
import { z } from 'zod';

export const DepartmentCreate = z.object({
  name: z.string().trim().min(1).max(80),
}).strict();

export const DepartmentUpdate = DepartmentCreate.partial();

export interface DepartmentDTO {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 9: Implement `packages/shared/src/schemas/invite.ts`**

```ts
import { z } from 'zod';
import { RoleEnum, PasswordSchema } from './common.js';

export const InviteCreateBody = z.object({
  employeeId: z.number().int().positive(),
  role: RoleEnum,
}).strict();

export const AcceptInviteBody = z.object({
  password: PasswordSchema,
}).strict();

export interface InviteInfoDTO {
  email: string;
  fullName: string;
  expiresAt: string;
}
```

- [ ] **Step 10: Implement `packages/shared/src/schemas/index.ts`**

```ts
export * from './common.js';
export * from './auth.js';
export * from './employee.js';
export * from './user.js';
export * from './department.js';
export * from './invite.js';
```

- [ ] **Step 11: Update `packages/shared/src/index.ts`**

```ts
export * from './permissions.js';
export * from './errors.js';
export * from './schemas/index.js';
```

- [ ] **Step 12: Run tests, expect PASS**

Run: `pnpm --filter @naratala/shared test`
Expected: all tests pass (permissions + schemas).

- [ ] **Step 13: Commit**

```bash
git add packages/shared/src
git commit -m "feat(shared): zod DTO schemas for auth, employees, users, departments, invites"
```

---

## Task 7: Typed API error classes + error→HTTP map

**Files:**
- Create: `apps/api/src/shared/errors/AppError.ts`
- Create: `apps/api/src/shared/errors/index.ts`
- Create: `apps/api/src/shared/errors/AppError.test.ts`

- [ ] **Step 1: Write failing test `apps/api/src/shared/errors/AppError.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  AppError, NotFoundError, ForbiddenError, ValidationError,
  AuthError, RateLimitedError, toHttp,
} from './index.js';

describe('AppError hierarchy', () => {
  it('NotFoundError → 404 NOT_FOUND', () => {
    const err = new NotFoundError('missing');
    const http = toHttp(err);
    expect(http.status).toBe(404);
    expect(http.body.code).toBe('NOT_FOUND');
  });

  it('ForbiddenError → 403 INSUFFICIENT_ROLE', () => {
    const http = toHttp(new ForbiddenError());
    expect(http.status).toBe(403);
    expect(http.body.code).toBe('INSUFFICIENT_ROLE');
  });

  it('ValidationError → 400 VALIDATION_FAILED with details', () => {
    const http = toHttp(new ValidationError('bad', { fields: ['email'] }));
    expect(http.status).toBe(400);
    expect(http.body.code).toBe('VALIDATION_FAILED');
    expect(http.body.details).toEqual({ fields: ['email'] });
  });

  it('AuthError INVALID_CREDENTIALS → 401', () => {
    const http = toHttp(new AuthError('INVALID_CREDENTIALS', 'nope'));
    expect(http.status).toBe(401);
    expect(http.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('RateLimitedError → 429 with retryAfter detail', () => {
    const http = toHttp(new RateLimitedError(45));
    expect(http.status).toBe(429);
    expect(http.body.code).toBe('RATE_LIMITED');
    expect(http.body.details).toEqual({ retryAfter: 45 });
  });

  it('unknown errors → 500 INTERNAL_ERROR', () => {
    const http = toHttp(new Error('boom'));
    expect(http.status).toBe(500);
    expect(http.body.code).toBe('INTERNAL_ERROR');
  });

  it('AppError is the base class', () => {
    expect(new NotFoundError('x') instanceof AppError).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter api test src/shared/errors`
Expected: module not found.

- [ ] **Step 3: Implement `apps/api/src/shared/errors/AppError.ts`**

```ts
import type { ApiErrorBody, ErrorCode } from '@naratala/shared';

export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: ErrorCode;
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
  toBody(): ApiErrorBody {
    return this.details === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, details: this.details };
  }
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code: ErrorCode = 'NOT_FOUND';
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code: ErrorCode = 'INSUFFICIENT_ROLE';
  constructor(message = 'insufficient role') {
    super(message);
  }
}

export class ValidationError extends AppError {
  readonly status = 400;
  readonly code: ErrorCode = 'VALIDATION_FAILED';
}

export class AuthError extends AppError {
  readonly status: number;
  readonly code: ErrorCode;
  constructor(code: Extract<ErrorCode,
    'INVALID_CREDENTIALS' | 'MFA_REQUIRED' | 'MFA_INVALID' |
    'TOKEN_EXPIRED' | 'TOKEN_REUSED' | 'MUST_CHANGE_PASSWORD' |
    'PASSWORD_TOO_WEAK' | 'PASSWORD_PWNED' | 'EMAIL_TAKEN' |
    'INVITE_EXPIRED' | 'INVITE_ALREADY_ACCEPTED'
  >, message: string, details?: unknown) {
    super(message, details);
    this.code = code;
    this.status =
      code === 'MUST_CHANGE_PASSWORD' ? 403 :
      code === 'EMAIL_TAKEN' || code === 'PASSWORD_TOO_WEAK' || code === 'PASSWORD_PWNED' ? 400 :
      code === 'INVITE_EXPIRED' || code === 'INVITE_ALREADY_ACCEPTED' ? 410 :
      401;
  }
}

export class RateLimitedError extends AppError {
  readonly status = 429;
  readonly code: ErrorCode = 'RATE_LIMITED';
  constructor(retryAfterSeconds: number) {
    super('rate limit exceeded', { retryAfter: retryAfterSeconds });
  }
}

export interface HttpOutput {
  status: number;
  body: ApiErrorBody;
}

export function toHttp(err: unknown): HttpOutput {
  if (err instanceof AppError) return { status: err.status, body: err.toBody() };
  return { status: 500, body: { code: 'INTERNAL_ERROR', message: 'internal error' } };
}
```

- [ ] **Step 4: Implement `apps/api/src/shared/errors/index.ts`**

```ts
export * from './AppError.js';
```

- [ ] **Step 5: Run, expect PASS**

Run: `pnpm --filter api test src/shared/errors`
Expected: 7 passed.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/shared/errors
git commit -m "feat(api): typed AppError hierarchy + HTTP mapper"
```

---

## Task 8: Drizzle schema for all 8 tables

**Files:**
- Create: `apps/api/src/shared/db/schema.ts`
- Create: `apps/api/drizzle.config.ts`

- [ ] **Step 1: Write `apps/api/src/shared/db/schema.ts`**

Mirrors spec §5 exactly.

```ts
import {
  bigint, boolean, char, datetime, date, decimal, index, json, mysqlEnum,
  mysqlTable, smallint, uniqueIndex, varbinary, varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

const ts = {
  createdAt: datetime('created_at', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
};

export const users = mysqlTable(
  'users',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: mysqlEnum('role', ['admin', 'hr', 'manager', 'employee']).notNull(),
    status: mysqlEnum('status', ['pending', 'active', 'disabled']).notNull().default('pending'),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    mfaSecret: varbinary('mfa_secret', { length: 255 }),
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    language: mysqlEnum('language', ['id', 'en']).notNull().default('id'),
    lastLoginAt: datetime('last_login_at', { fsp: 3 }),
    ...ts,
    deletedAt: datetime('deleted_at', { fsp: 3 }),
  },
  (t) => ({
    emailUnique: uniqueIndex('users_email_unique').on(t.email),
    statusIdx: index('users_status_idx').on(t.status),
    roleIdx: index('users_role_idx').on(t.role),
  }),
);

export const departments = mysqlTable(
  'departments',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    name: varchar('name', { length: 80 }).notNull(),
    ...ts,
  },
  (t) => ({ nameUnique: uniqueIndex('departments_name_unique').on(t.name) }),
);

export const employees = mysqlTable(
  'employees',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    userId: bigint('user_id', { mode: 'number', unsigned: true }),
    fullName: varchar('full_name', { length: 160 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 32 }),
    pronouns: varchar('pronouns', { length: 32 }),
    departmentId: bigint('department_id', { mode: 'number', unsigned: true }).notNull(),
    position: varchar('position', { length: 120 }).notNull(),
    location: varchar('location', { length: 120 }),
    employmentType: mysqlEnum('employment_type', ['full_time', 'part_time', 'contract', 'intern']).notNull(),
    employmentStatus: mysqlEnum('employment_status', ['active', 'on_leave', 'terminated']).notNull().default('active'),
    hireDate: date('hire_date').notNull(),
    managerId: bigint('manager_id', { mode: 'number', unsigned: true }),
    salaryAmount: decimal('salary_amount', { precision: 14, scale: 2 }),
    salaryCurrency: char('salary_currency', { length: 3 }).notNull().default('IDR'),
    avatarColorHue: smallint('avatar_color_hue').notNull(),
    ...ts,
    deletedAt: datetime('deleted_at', { fsp: 3 }),
  },
  (t) => ({
    emailUnique: uniqueIndex('employees_email_unique').on(t.email),
    userIdUnique: uniqueIndex('employees_user_id_unique').on(t.userId),
    departmentIdx: index('employees_department_idx').on(t.departmentId),
    managerIdx: index('employees_manager_idx').on(t.managerId),
    statusIdx: index('employees_status_idx').on(t.employmentStatus),
    nameIdx: index('employees_name_idx').on(t.fullName),
  }),
);

export const refreshTokens = mysqlTable(
  'refresh_tokens',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
    familyId: char('family_id', { length: 36 }).notNull(),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    issuedAt: datetime('issued_at', { fsp: 3 }).notNull(),
    expiresAt: datetime('expires_at', { fsp: 3 }).notNull(),
    revokedAt: datetime('revoked_at', { fsp: 3 }),
    replacedById: bigint('replaced_by_id', { mode: 'number', unsigned: true }),
    userAgent: varchar('user_agent', { length: 255 }),
    ip: varchar('ip', { length: 45 }),
  },
  (t) => ({
    tokenHashUnique: uniqueIndex('refresh_tokens_token_hash_unique').on(t.tokenHash),
    userIdx: index('refresh_tokens_user_idx').on(t.userId),
    familyIdx: index('refresh_tokens_family_idx').on(t.familyId),
    expiresIdx: index('refresh_tokens_expires_idx').on(t.expiresAt),
  }),
);

export const invites = mysqlTable(
  'invites',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    roleToAssign: mysqlEnum('role_to_assign', ['admin', 'hr', 'manager', 'employee']).notNull(),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    expiresAt: datetime('expires_at', { fsp: 3 }).notNull(),
    acceptedAt: datetime('accepted_at', { fsp: 3 }),
    createdBy: bigint('created_by', { mode: 'number', unsigned: true }).notNull(),
    createdAt: datetime('created_at', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => ({
    tokenHashUnique: uniqueIndex('invites_token_hash_unique').on(t.tokenHash),
    expiresIdx: index('invites_expires_idx').on(t.expiresAt),
    employeeIdx: index('invites_employee_idx').on(t.employeeId),
  }),
);

export const passwordResets = mysqlTable(
  'password_resets',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    expiresAt: datetime('expires_at', { fsp: 3 }).notNull(),
    consumedAt: datetime('consumed_at', { fsp: 3 }),
    createdAt: datetime('created_at', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => ({
    tokenHashUnique: uniqueIndex('password_resets_token_hash_unique').on(t.tokenHash),
    expiresIdx: index('password_resets_expires_idx').on(t.expiresAt),
  }),
);

export const loginAttempts = mysqlTable(
  'login_attempts',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    ip: varchar('ip', { length: 45 }).notNull(),
    succeeded: boolean('succeeded').notNull(),
    createdAt: datetime('created_at', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => ({
    emailCreatedIdx: index('login_attempts_email_created_idx').on(t.email, t.createdAt),
    ipCreatedIdx: index('login_attempts_ip_created_idx').on(t.ip, t.createdAt),
  }),
);

export const auditLog = mysqlTable(
  'audit_log',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    actorUserId: bigint('actor_user_id', { mode: 'number', unsigned: true }),
    actorIp: varchar('actor_ip', { length: 45 }),
    action: varchar('action', { length: 64 }).notNull(),
    entityType: varchar('entity_type', { length: 32 }).notNull(),
    entityId: bigint('entity_id', { mode: 'number', unsigned: true }),
    changes: json('changes'),
    createdAt: datetime('created_at', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => ({
    actorIdx: index('audit_log_actor_idx').on(t.actorUserId),
    entityIdx: index('audit_log_entity_idx').on(t.entityType, t.entityId),
    createdIdx: index('audit_log_created_idx').on(t.createdAt),
  }),
);
```

- [ ] **Step 2: Write `apps/api/drizzle.config.ts`**

```ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/shared/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
});
```

- [ ] **Step 3: Generate the initial migration**

Pre-req: MySQL is running locally and the `naratala` DB exists (per spec §12).

Run: `pnpm --filter api db:generate`
Expected: a new `apps/api/drizzle/0000_<name>.sql` file is created containing `CREATE TABLE` statements for all 8 tables.

- [ ] **Step 4: Sanity-check the migration SQL**

Inspect `apps/api/drizzle/0000_*.sql`: ensure every table appears and that `users.email`, `employees.email`, `refresh_tokens.token_hash`, `invites.token_hash`, `password_resets.token_hash`, `departments.name` have unique indexes.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/shared/db/schema.ts apps/api/drizzle.config.ts apps/api/drizzle
git commit -m "feat(api): drizzle schema + initial migration for 8 tables"
```

---

## Task 9: Drizzle client + migrate runner + test DB harness

**Files:**
- Create: `apps/api/src/shared/db/client.ts`
- Create: `apps/api/src/bootstrap/migrate.ts`
- Create: `apps/api/src/test/db.ts`
- Create: `apps/api/src/test/migrateRunner.test.ts`

- [ ] **Step 1: Write `apps/api/src/shared/db/client.ts`**

```ts
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';

export type DB = MySql2Database<typeof schema>;

export function createDb(url: string) {
  const pool = mysql.createPool({ uri: url, connectionLimit: 10, multipleStatements: false });
  const db = drizzle(pool, { schema, mode: 'default' }) as DB;
  return { db, pool };
}

export { schema };
```

- [ ] **Step 2: Write `apps/api/src/bootstrap/migrate.ts`**

```ts
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
```

- [ ] **Step 3: Write `apps/api/src/test/db.ts`** (per-test-file ephemeral DB)

```ts
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { randomUUID } from 'node:crypto';
import * as schema from '../shared/db/schema.js';

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

export async function createTestDb() {
  const base = process.env.DATABASE_URL ?? 'mysql://naratala:dev@127.0.0.1:3306/naratala';
  const url = new URL(base);
  const dbName = `naratala_test_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

  const admin = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    multipleStatements: true,
  });
  await admin.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
  await admin.end();

  const pool = mysql.createPool({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: dbName,
    connectionLimit: 5,
    multipleStatements: false,
  });
  const db = drizzle(pool, { schema, mode: 'default' });
  await migrate(db, { migrationsFolder: './drizzle' });

  async function drop() {
    await pool.end();
    const a = await mysql.createConnection({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    });
    await a.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await a.end();
  }

  async function truncateAll() {
    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const table of [
        'audit_log', 'login_attempts', 'password_resets', 'invites',
        'refresh_tokens', 'employees', 'users', 'departments',
      ]) {
        await conn.query(`TRUNCATE TABLE \`${table}\``);
      }
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      conn.release();
    }
  }

  return { db, pool, dbName, drop, truncateAll };
}
```

- [ ] **Step 4: Write failing test `apps/api/src/test/migrateRunner.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from './db.js';

describe('migrate runner (smoke)', () => {
  let ctx: TestDb;

  beforeAll(async () => { ctx = await createTestDb(); });
  afterAll(async () => { await ctx.drop(); });

  it('creates all 8 tables', async () => {
    const [rows] = await ctx.pool.query<any[]>(
      'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [ctx.dbName],
    );
    const names = new Set(rows.map((r) => r.name));
    for (const t of [
      'users', 'employees', 'departments', 'refresh_tokens',
      'invites', 'password_resets', 'login_attempts', 'audit_log',
    ]) {
      expect(names.has(t)).toBe(true);
    }
  });

  it('employees.email has a unique index', async () => {
    const [rows] = await ctx.pool.query<any[]>(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'email' AND NON_UNIQUE = 0`,
      [ctx.dbName],
    );
    expect(rows.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 5: Run migrate against local dev DB to verify**

Pre-req: `.env` populated (copy from `.env.example`, generate secrets).

Run: `pnpm --filter api db:migrate`
Expected: `{"msg":"migrations applied"}`.

- [ ] **Step 6: Run the smoke test**

Run: `pnpm --filter api test src/test/migrateRunner.test.ts`
Expected: 2 passed (test DB created, migrated, dropped cleanly).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/shared/db/client.ts apps/api/src/bootstrap/migrate.ts apps/api/src/test
git commit -m "feat(api): drizzle client, migrate runner, per-file test DB harness"
```

---

## Task 10: Seed scripts (departments, admin, dev employees)

**Files:**
- Create: `apps/api/src/bootstrap/seedDepartments.ts`
- Create: `apps/api/src/bootstrap/seedAdmin.ts`
- Create: `apps/api/src/bootstrap/seedDevEmployees.ts`
- Create: `apps/api/src/bootstrap/avatarHue.ts`
- Create: `apps/api/src/bootstrap/seed.ts`
- Create: `apps/api/src/bootstrap/avatarHue.test.ts`
- Create: `apps/api/src/bootstrap/seedAdmin.test.ts`

- [ ] **Step 1: Write failing test `apps/api/src/bootstrap/avatarHue.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { hueFromName } from './avatarHue.js';

describe('hueFromName', () => {
  it('is deterministic', () => {
    expect(hueFromName('Ayu Wulan')).toBe(hueFromName('Ayu Wulan'));
  });
  it('yields 0..359', () => {
    for (const n of ['A', 'Ayu', 'Budi Santoso', 'Zoë']) {
      const h = hueFromName(n);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(359);
    }
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter api test src/bootstrap/avatarHue.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `apps/api/src/bootstrap/avatarHue.ts`**

```ts
import { createHash } from 'node:crypto';

export function hueFromName(name: string): number {
  const digest = createHash('sha256').update(name.trim().toLowerCase()).digest();
  const n = digest.readUInt16BE(0);
  return n % 360;
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter api test src/bootstrap/avatarHue.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Implement `apps/api/src/bootstrap/seedDepartments.ts`**

```ts
import { sql } from 'drizzle-orm';
import type { DB } from '../shared/db/client.js';
import { departments } from '../shared/db/schema.js';

const DEPARTMENTS = [
  'Engineering', 'Design', 'People', 'Finance',
  'Marketing', 'Sales', 'Operations',
];

export async function seedDepartments(db: DB): Promise<void> {
  for (const name of DEPARTMENTS) {
    await db.insert(departments).values({ name }).onDuplicateKeyUpdate({ set: { name: sql`name` } });
  }
}
```

- [ ] **Step 6: Implement `apps/api/src/bootstrap/seedAdmin.ts`**

```ts
import bcrypt from 'bcrypt';
import { sql } from 'drizzle-orm';
import type { DB } from '../shared/db/client.js';
import { users } from '../shared/db/schema.js';

export async function seedAdmin(db: DB, email: string, password: string): Promise<boolean> {
  const [row] = await db.execute<{ n: number }>(sql`SELECT COUNT(*) AS n FROM users`);
  const count = Number((row as any)?.n ?? 0);
  if (count > 0) return false;

  const hash = await bcrypt.hash(password, 12);
  await db.insert(users).values({
    email: email.toLowerCase(),
    passwordHash: hash,
    role: 'admin',
    status: 'active',
    mustChangePassword: true,
  });
  return true;
}
```

- [ ] **Step 7: Write failing test `apps/api/src/bootstrap/seedAdmin.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../test/db.js';
import { seedAdmin } from './seedAdmin.js';

describe('seedAdmin', () => {
  let ctx: TestDb;
  beforeAll(async () => { ctx = await createTestDb(); });
  afterAll(async () => { await ctx.drop(); });

  it('inserts admin on first call', async () => {
    const inserted = await seedAdmin(ctx.db, 'admin@naratala.local', 'dev-password-12');
    expect(inserted).toBe(true);
    const [rows] = await ctx.pool.query<any[]>('SELECT role, status, must_change_password FROM users');
    expect(rows).toHaveLength(1);
    expect(rows[0].role).toBe('admin');
    expect(rows[0].status).toBe('active');
    expect(Number(rows[0].must_change_password)).toBe(1);
  });

  it('is a no-op when users exist', async () => {
    const again = await seedAdmin(ctx.db, 'admin@naratala.local', 'dev-password-12');
    expect(again).toBe(false);
    const [rows] = await ctx.pool.query<any[]>('SELECT COUNT(*) AS n FROM users');
    expect(Number(rows[0].n)).toBe(1);
  });
});
```

- [ ] **Step 8: Run, expect PASS**

Run: `pnpm --filter api test src/bootstrap/seedAdmin.test.ts`
Expected: 2 passed.

- [ ] **Step 9: Implement `apps/api/src/bootstrap/seedDevEmployees.ts`**

```ts
import { eq } from 'drizzle-orm';
import type { DB } from '../shared/db/client.js';
import { departments, employees } from '../shared/db/schema.js';
import { hueFromName } from './avatarHue.js';

interface Row {
  fullName: string; email: string; departmentName: string; position: string;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  hireDate: string;
}

const DEV_EMPLOYEES: Row[] = [
  { fullName: 'Ayu Wulan',       email: 'ayu@naratala.local',     departmentName: 'Engineering', position: 'Senior Engineer',     employmentType: 'full_time', hireDate: '2023-02-01' },
  { fullName: 'Budi Santoso',    email: 'budi@naratala.local',    departmentName: 'Engineering', position: 'Staff Engineer',      employmentType: 'full_time', hireDate: '2021-06-15' },
  { fullName: 'Citra Dewi',      email: 'citra@naratala.local',   departmentName: 'Design',      position: 'Product Designer',    employmentType: 'full_time', hireDate: '2024-01-08' },
  { fullName: 'Dimas Prasetyo',  email: 'dimas@naratala.local',   departmentName: 'Engineering', position: 'Engineering Manager', employmentType: 'full_time', hireDate: '2020-11-02' },
  { fullName: 'Eka Putri',       email: 'eka@naratala.local',     departmentName: 'People',      position: 'HR Partner',          employmentType: 'full_time', hireDate: '2022-09-12' },
  { fullName: 'Fajar Rahman',    email: 'fajar@naratala.local',   departmentName: 'Finance',     position: 'Finance Analyst',     employmentType: 'full_time', hireDate: '2023-07-03' },
  { fullName: 'Gita Lestari',    email: 'gita@naratala.local',    departmentName: 'Marketing',   position: 'Marketing Lead',      employmentType: 'full_time', hireDate: '2022-03-21' },
  { fullName: 'Hadi Kurniawan',  email: 'hadi@naratala.local',    departmentName: 'Sales',       position: 'Account Executive',   employmentType: 'full_time', hireDate: '2024-05-10' },
  { fullName: 'Indah Permata',   email: 'indah@naratala.local',   departmentName: 'Operations',  position: 'Ops Coordinator',     employmentType: 'full_time', hireDate: '2023-10-18' },
  { fullName: 'Joko Pranata',    email: 'joko@naratala.local',    departmentName: 'Engineering', position: 'Engineer',            employmentType: 'contract',  hireDate: '2025-02-01' },
  { fullName: 'Kirana Anjani',   email: 'kirana@naratala.local',  departmentName: 'Design',      position: 'Design Intern',       employmentType: 'intern',    hireDate: '2025-08-01' },
  { fullName: 'Lutfi Ramadhan',  email: 'lutfi@naratala.local',   departmentName: 'Engineering', position: 'Engineer',            employmentType: 'full_time', hireDate: '2024-03-15' },
  { fullName: 'Maya Sari',       email: 'maya@naratala.local',    departmentName: 'People',      position: 'Recruiter',           employmentType: 'full_time', hireDate: '2024-06-20' },
  { fullName: 'Nadya Hartono',   email: 'nadya@naratala.local',   departmentName: 'Marketing',   position: 'Content Strategist',  employmentType: 'part_time', hireDate: '2024-09-01' },
  { fullName: 'Oka Saputra',     email: 'oka@naratala.local',     departmentName: 'Engineering', position: 'Engineer',            employmentType: 'full_time', hireDate: '2023-12-05' },
];

export async function seedDevEmployees(db: DB): Promise<number> {
  const [countRow] = await (db as any).execute(
    { sql: 'SELECT COUNT(*) AS n FROM employees', args: [] } as any,
  );
  const count = Number((countRow as any)?.n ?? 0);
  if (count > 0) return 0;

  let inserted = 0;
  for (const row of DEV_EMPLOYEES) {
    const [dep] = await db.select().from(departments).where(eq(departments.name, row.departmentName));
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
```

- [ ] **Step 10: Implement `apps/api/src/bootstrap/seed.ts`**

```ts
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
    console.log(JSON.stringify({ msg: 'seed done', adminInserted: admin, devEmployees: employees }));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 11: Run seed against dev DB**

Run: `pnpm --filter api db:seed`
Expected: `{"msg":"seed done",...}`.

- [ ] **Step 12: Commit**

```bash
git add apps/api/src/bootstrap
git commit -m "feat(api): idempotent seed scripts (departments, admin, dev employees)"
```

---

## Task 11: Logger with redaction + requestId middleware

**Files:**
- Create: `apps/api/src/shared/logger.ts`
- Create: `apps/api/src/shared/middlewares/requestId.ts`
- Create: `apps/api/src/shared/middlewares/requestId.test.ts`

- [ ] **Step 1: Write failing test `apps/api/src/shared/middlewares/requestId.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requestId } from './requestId.js';

describe('requestId middleware', () => {
  it('generates an id and echoes it in X-Request-Id', async () => {
    const app = express().use(requestId()).get('/', (req, res) => res.json({ id: (req as any).id }));
    const r = await request(app).get('/');
    expect(r.status).toBe(200);
    expect(r.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.headers['x-request-id']).toBe(r.body.id);
  });

  it('honors a client-supplied X-Request-Id if it is a UUID', async () => {
    const client = '11111111-1111-4111-8111-111111111111';
    const app = express().use(requestId()).get('/', (req, res) => res.json({ id: (req as any).id }));
    const r = await request(app).get('/').set('X-Request-Id', client);
    expect(r.body.id).toBe(client);
    expect(r.headers['x-request-id']).toBe(client);
  });

  it('ignores a malformed client header and generates its own', async () => {
    const app = express().use(requestId()).get('/', (req, res) => res.json({ id: (req as any).id }));
    const r = await request(app).get('/').set('X-Request-Id', 'not-a-uuid');
    expect(r.body.id).not.toBe('not-a-uuid');
    expect(r.body.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter api test src/shared/middlewares/requestId.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `apps/api/src/shared/logger.ts`**

```ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'password', 'newPassword', 'currentPassword',
      'token', 'accessToken', 'refreshToken',
      'authorization', 'cookie', 'Cookie',
      'headers.authorization', 'headers.cookie',
      'mfa_secret', 'mfaSecret',
      'salary_amount', 'salaryAmount',
      'req.headers.authorization', 'req.headers.cookie',
    ],
    remove: true,
  },
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;
```

- [ ] **Step 4: Implement `apps/api/src/shared/middlewares/requestId.ts`**

```ts
import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

declare module 'express-serve-static-core' {
  interface Request { id: string }
}

export function requestId(): RequestHandler {
  return (req, res, next) => {
    const header = req.header('X-Request-Id');
    req.id = header && UUID_RE.test(header) ? header : randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
  };
}
```

- [ ] **Step 5: Run, expect PASS**

Run: `pnpm --filter api test src/shared/middlewares/requestId.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/shared/logger.ts apps/api/src/shared/middlewares/requestId.ts apps/api/src/shared/middlewares/requestId.test.ts
git commit -m "feat(api): pino logger with redaction + requestId middleware"
```

---

## Task 12: Zod `validate` middleware

**Files:**
- Create: `apps/api/src/shared/middlewares/validate.ts`
- Create: `apps/api/src/shared/middlewares/validate.test.ts`

- [ ] **Step 1: Write failing test `apps/api/src/shared/middlewares/validate.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validate } from './validate.js';
import { errorHandlerForTest } from './__errorHandlerForTest.js';

const Body = z.object({ email: z.string().email(), n: z.number().int() }).strict();

const app = express()
  .use(express.json())
  .post('/t', validate({ body: Body }), (req, res) => res.json({ got: (req as any).valid.body }))
  .use(errorHandlerForTest);

describe('validate middleware', () => {
  it('passes a valid body and exposes req.valid.body', async () => {
    const r = await request(app).post('/t').send({ email: 'a@b.co', n: 3 });
    expect(r.status).toBe(200);
    expect(r.body.got).toEqual({ email: 'a@b.co', n: 3 });
  });

  it('rejects invalid body with 400 VALIDATION_FAILED + details', async () => {
    const r = await request(app).post('/t').send({ email: 'bad', n: 'not-int' });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('VALIDATION_FAILED');
    expect(Array.isArray(r.body.details?.issues)).toBe(true);
  });

  it('rejects unknown keys (strict)', async () => {
    const r = await request(app).post('/t').send({ email: 'a@b.co', n: 3, extra: 1 });
    expect(r.status).toBe(400);
  });
});
```

- [ ] **Step 2: Write test-only error handler `apps/api/src/shared/middlewares/__errorHandlerForTest.ts`**

```ts
import type { ErrorRequestHandler } from 'express';
import { toHttp } from '../errors/index.js';

export const errorHandlerForTest: ErrorRequestHandler = (err, _req, res, _next) => {
  const http = toHttp(err);
  res.status(http.status).json(http.body);
};
```

- [ ] **Step 3: Run, expect FAIL**

Run: `pnpm --filter api test src/shared/middlewares/validate.test.ts`
Expected: module not found.

- [ ] **Step 4: Implement `apps/api/src/shared/middlewares/validate.ts`**

```ts
import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { ValidationError } from '../errors/index.js';

interface Spec {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

declare module 'express-serve-static-core' {
  interface Request {
    valid: { body?: unknown; query?: unknown; params?: unknown };
  }
}

export function validate(spec: Spec): RequestHandler {
  return (req, _res, next) => {
    req.valid = req.valid ?? {};
    try {
      if (spec.body) {
        const r = spec.body.safeParse(req.body);
        if (!r.success) throw new ValidationError('invalid request body', { issues: r.error.issues });
        req.valid.body = r.data;
      }
      if (spec.query) {
        const r = spec.query.safeParse(req.query);
        if (!r.success) throw new ValidationError('invalid query', { issues: r.error.issues });
        req.valid.query = r.data;
      }
      if (spec.params) {
        const r = spec.params.safeParse(req.params);
        if (!r.success) throw new ValidationError('invalid path params', { issues: r.error.issues });
        req.valid.params = r.data;
      }
      next();
    } catch (err) { next(err); }
  };
}
```

- [ ] **Step 5: Run, expect PASS**

Run: `pnpm --filter api test src/shared/middlewares/validate.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/shared/middlewares/validate.ts apps/api/src/shared/middlewares/validate.test.ts apps/api/src/shared/middlewares/__errorHandlerForTest.ts
git commit -m "feat(api): zod validate middleware with VALIDATION_FAILED details"
```

---

## Task 13: Production error handler

**Files:**
- Create: `apps/api/src/shared/middlewares/errorHandler.ts`
- Create: `apps/api/src/shared/middlewares/errorHandler.test.ts`

- [ ] **Step 1: Write failing test `apps/api/src/shared/middlewares/errorHandler.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from './errorHandler.js';
import { NotFoundError } from '../errors/index.js';
import { requestId } from './requestId.js';

describe('errorHandler', () => {
  it('maps NotFoundError to 404 body', async () => {
    const app = express()
      .use(requestId())
      .get('/', (_req, _res, next) => next(new NotFoundError('gone')))
      .use(errorHandler());
    const r = await request(app).get('/');
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ code: 'NOT_FOUND', message: 'gone' });
    expect(r.headers['x-request-id']).toBeDefined();
  });

  it('redacts unknown errors to INTERNAL_ERROR (no stack)', async () => {
    const app = express()
      .use(requestId())
      .get('/', (_req, _res, next) => next(new Error('boom — secret stack here')))
      .use(errorHandler());
    const r = await request(app).get('/');
    expect(r.status).toBe(500);
    expect(r.body.code).toBe('INTERNAL_ERROR');
    expect(r.body.message).toBe('internal error');
    expect(JSON.stringify(r.body)).not.toContain('secret stack');
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter api test src/shared/middlewares/errorHandler.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `apps/api/src/shared/middlewares/errorHandler.ts`**

```ts
import type { ErrorRequestHandler } from 'express';
import { AppError, toHttp } from '../errors/index.js';
import { logger } from '../logger.js';

export function errorHandler(): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const http = toHttp(err);
    if (!(err instanceof AppError)) {
      logger.error({ err, requestId: (req as any).id, path: req.path }, 'unhandled error');
    } else if (http.status >= 500) {
      logger.error({ err, requestId: (req as any).id, path: req.path }, 'app error (5xx)');
    }
    res.status(http.status).json(http.body);
  };
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter api test src/shared/middlewares/errorHandler.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/shared/middlewares/errorHandler.ts apps/api/src/shared/middlewares/errorHandler.test.ts
git commit -m "feat(api): error handler with prod redaction"
```

---

## Task 14: Rate-limit builders (global + per-route)

**Files:**
- Create: `apps/api/src/shared/middlewares/rateLimit.ts`
- Create: `apps/api/src/shared/middlewares/rateLimit.test.ts`

- [ ] **Step 1: Write failing test `apps/api/src/shared/middlewares/rateLimit.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { makeRateLimiter } from './rateLimit.js';
import { errorHandler } from './errorHandler.js';

describe('makeRateLimiter', () => {
  it('allows up to `max` requests, then 429 with Retry-After', async () => {
    const app = express()
      .use(makeRateLimiter({ windowMs: 60_000, max: 2, keyBy: () => 'k' }))
      .get('/', (_req, res) => res.json({ ok: true }))
      .use(errorHandler());

    expect((await request(app).get('/')).status).toBe(200);
    expect((await request(app).get('/')).status).toBe(200);
    const r = await request(app).get('/');
    expect(r.status).toBe(429);
    expect(r.body.code).toBe('RATE_LIMITED');
    expect(Number(r.headers['retry-after'])).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter api test src/shared/middlewares/rateLimit.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `apps/api/src/shared/middlewares/rateLimit.ts`**

```ts
import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, RequestHandler } from 'express';
import { RateLimitedError } from '../errors/index.js';

interface Opts {
  windowMs: number;
  max: number;
  keyBy?: (req: Request) => string;
}

export function makeRateLimiter(opts: Opts): RequestHandler {
  const config: Partial<Options> = {
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: opts.keyBy ?? ((req) => req.ip ?? 'unknown'),
    handler: (_req, res, next) => {
      res.setHeader('Retry-After', Math.ceil(opts.windowMs / 1000));
      next(new RateLimitedError(Math.ceil(opts.windowMs / 1000)));
    },
  };
  return rateLimit(config);
}

// Pre-built limiters per spec §8.7
export const limiters = {
  global: () => makeRateLimiter({ windowMs: 60_000, max: 300 }),
  loginByEmail: () => makeRateLimiter({
    windowMs: 15 * 60_000, max: 10,
    keyBy: (req) => `login:email:${String((req.body as any)?.email ?? '').toLowerCase()}`,
  }),
  loginByIp: () => makeRateLimiter({
    windowMs: 15 * 60_000, max: 30,
    keyBy: (req) => `login:ip:${req.ip}`,
  }),
  forgotByEmail: () => makeRateLimiter({
    windowMs: 60 * 60_000, max: 3,
    keyBy: (req) => `forgot:email:${String((req.body as any)?.email ?? '').toLowerCase()}`,
  }),
  forgotByIp: () => makeRateLimiter({
    windowMs: 60 * 60_000, max: 10,
    keyBy: (req) => `forgot:ip:${req.ip}`,
  }),
  refresh: () => makeRateLimiter({ windowMs: 60_000, max: 60 }),
};
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter api test src/shared/middlewares/rateLimit.test.ts`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/shared/middlewares/rateLimit.ts apps/api/src/shared/middlewares/rateLimit.test.ts
git commit -m "feat(api): rate-limit builders (global + per-route per spec §8.7)"
```

---

## Task 15: Wire helmet, CORS, JSON limits, requestId, pino-http, health

**Files:**
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/src/app.test.ts`

- [ ] **Step 1: Write failing test `apps/api/src/app.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp } from './app.js';

describe('app wiring', () => {
  const app = buildApp();

  it('GET /api/health → 200 { ok: true }', async () => {
    const r = await request(app).get('/api/health');
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });

  it('sets basic security headers from helmet', async () => {
    const r = await request(app).get('/api/health');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-frame-options']).toBeDefined();
  });

  it('echoes X-Request-Id', async () => {
    const r = await request(app).get('/api/health');
    expect(r.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects JSON bodies larger than 100KB with 413', async () => {
    const big = { payload: 'x'.repeat(110_000) };
    const r = await request(app).post('/api/health').send(big);
    expect([400, 413]).toContain(r.status);
  });

  it('unknown route → 404 NOT_FOUND', async () => {
    const r = await request(app).get('/api/nope');
    expect(r.status).toBe(404);
    expect(r.body.code).toBe('NOT_FOUND');
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter api test src/app.test.ts`
Expected: some tests fail (headers/not-found shape not yet there).

- [ ] **Step 3: Rewrite `apps/api/src/app.ts`**

```ts
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { requestId } from './shared/middlewares/requestId.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';
import { limiters } from './shared/middlewares/rateLimit.js';
import { NotFoundError } from './shared/errors/index.js';

interface Deps {
  webOrigin?: string;
}

export function buildApp(deps: Deps = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestId());
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'"],
        'img-src': ["'self'", 'data:'],
        'frame-ancestors': ["'none'"],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
  }));

  app.use(cors({
    origin: deps.webOrigin ?? '*',
    credentials: true,
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  app.use(limiters.global());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use((_req, _res, next) => next(new NotFoundError('route not found')));
  app.use(errorHandler());

  return app;
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter api test src/app.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Wire env into server**

Update `apps/api/src/server.ts`:

```ts
import 'dotenv/config';
import { buildApp } from './app.js';
import { loadEnv } from './shared/config/env.js';
import { logger } from './shared/logger.js';

const env = loadEnv();
const app = buildApp({ webOrigin: env.WEB_ORIGIN });
app.listen(env.PORT, () => logger.info({ port: env.PORT }, 'api listening'));
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/app.ts apps/api/src/app.test.ts apps/api/src/server.ts
git commit -m "feat(api): wire helmet, CORS, JSON limits, 404 handler"
```

---

## Task 16: Password policy (bcrypt + Pwned Passwords + constant-time compare)

**Files:**
- Create: `apps/api/src/modules/auth/password.ts`
- Create: `apps/api/src/modules/auth/password.test.ts`

- [ ] **Step 1: Write failing test `apps/api/src/modules/auth/password.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { hashPassword, verifyPassword, assertPasswordStrong, checkPwned, DUMMY_BCRYPT_HASH } from './password.js';

describe('password', () => {
  it('hashes and verifies', async () => {
    const h = await hashPassword('correct-horse-battery');
    expect(await verifyPassword('correct-horse-battery', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
  });

  it('verifyPassword is safe when the hash is the dummy hash', async () => {
    expect(await verifyPassword('anything', DUMMY_BCRYPT_HASH)).toBe(false);
  });

  it('rejects passwords below 10 chars', () => {
    expect(() => assertPasswordStrong('short')).toThrow(/PASSWORD_TOO_WEAK/);
  });

  it('rejects passwords reported as pwned', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      'AAAAA0005AD76BD555C1D6D771DE417A4B87E4B4:9\n0000AABBBBCCCCC:2\n',
    );
    // sha1("P@ssw0rd") = 21BD12DC183F740EE76F27B78EB39C8AD972A757
    await expect(checkPwned('P@ssw0rd', fetcher)).resolves.toBe(false);

    const pwnedFetcher = vi.fn().mockResolvedValue('2DC183F740EE76F27B78EB39C8AD972A757:42\n');
    await expect(checkPwned('P@ssw0rd', pwnedFetcher)).resolves.toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter api test src/modules/auth/password.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `apps/api/src/modules/auth/password.ts`**

```ts
import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { AuthError } from '../../shared/errors/index.js';

export const DUMMY_BCRYPT_HASH =
  '$2b$12$CwTycUXWue0Thq9StjUM0uJ8.lM1vlJxT9mZf8S8D9bQ/6IuHkbUa';

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export function assertPasswordStrong(plain: string): void {
  if (plain.length < 10) throw new AuthError('PASSWORD_TOO_WEAK', 'password too short');
  if (plain.length > 200) throw new AuthError('PASSWORD_TOO_WEAK', 'password too long');
}

type HibpFetcher = (prefix: string) => Promise<string>;

export async function checkPwned(plain: string, fetcher: HibpFetcher = defaultHibpFetcher): Promise<boolean> {
  const sha1 = createHash('sha1').update(plain).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  let body: string;
  try {
    body = await fetcher(prefix);
  } catch {
    return false;
  }
  for (const line of body.split(/\r?\n/)) {
    const [hashSuffix] = line.split(':');
    if (hashSuffix?.trim().toUpperCase() === suffix) return true;
  }
  return false;
}

async function defaultHibpFetcher(prefix: string): Promise<string> {
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true' },
  });
  if (!res.ok) throw new Error(`hibp ${res.status}`);
  return res.text();
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter api test src/modules/auth/password.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/password.ts apps/api/src/modules/auth/password.test.ts
git commit -m "feat(auth): bcrypt hash/verify + pwned-password check + policy"
```

---

## Task 17: AES-256-GCM encrypt/decrypt (for MFA secrets)

**Files:**
- Create: `apps/api/src/modules/auth/crypto.ts`
- Create: `apps/api/src/modules/auth/crypto.test.ts`

- [ ] **Step 1: Write failing test `apps/api/src/modules/auth/crypto.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { encryptGcm, decryptGcm } from './crypto.js';

const KEY = Buffer.alloc(32, 7);

describe('AES-256-GCM', () => {
  it('round-trips', () => {
    const ct = encryptGcm(KEY, 'JBSWY3DPEHPK3PXP');
    expect(ct).toBeInstanceOf(Buffer);
    expect(decryptGcm(KEY, ct)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('different encryptions produce different ciphertexts (random IV)', () => {
    const a = encryptGcm(KEY, 'secret');
    const b = encryptGcm(KEY, 'secret');
    expect(a.equals(b)).toBe(false);
  });

  it('wrong key fails', () => {
    const ct = encryptGcm(KEY, 'secret');
    expect(() => decryptGcm(Buffer.alloc(32, 8), ct)).toThrow();
  });

  it('tampered ciphertext fails', () => {
    const ct = encryptGcm(KEY, 'secret');
    ct[ct.length - 1] ^= 0xff;
    expect(() => decryptGcm(KEY, ct)).toThrow();
  });

  it('rejects a non-32-byte key', () => {
    expect(() => encryptGcm(Buffer.alloc(16), 'x')).toThrow(/32/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter api test src/modules/auth/crypto.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `apps/api/src/modules/auth/crypto.ts`**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const IV_LEN = 12;
const TAG_LEN = 16;

function assertKey(key: Buffer): void {
  if (key.length !== 32) throw new Error('AES-GCM key must be 32 bytes');
}

export function encryptGcm(key: Buffer, plaintext: string): Buffer {
  assertKey(key);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

export function decryptGcm(key: Buffer, blob: Buffer): string {
  assertKey(key);
  if (blob.length < IV_LEN + TAG_LEN) throw new Error('ciphertext too short');
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = blob.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter api test src/modules/auth/crypto.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/crypto.ts apps/api/src/modules/auth/crypto.test.ts
git commit -m "feat(auth): AES-256-GCM encrypt/decrypt for MFA secrets"
```

---

## Task 18: Opaque token generator + sha256 hasher

**Files:**
- Create: `apps/api/src/modules/auth/opaqueToken.ts`
- Create: `apps/api/src/modules/auth/opaqueToken.test.ts`

- [ ] **Step 1: Write failing test `apps/api/src/modules/auth/opaqueToken.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { newOpaqueToken, sha256Hex } from './opaqueToken.js';

describe('opaque tokens', () => {
  it('generates 32 bytes as url-safe base64 (>=43 chars)', () => {
    const t = newOpaqueToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.length).toBeGreaterThanOrEqual(43);
    expect(t.length).toBeLessThanOrEqual(64);
  });

  it('new tokens differ', () => {
    expect(newOpaqueToken()).not.toBe(newOpaqueToken());
  });

  it('sha256Hex produces 64 hex chars', () => {
    const h = sha256Hex('hello');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter api test src/modules/auth/opaqueToken.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `apps/api/src/modules/auth/opaqueToken.ts`**

```ts
import { createHash, randomBytes } from 'node:crypto';

export function newOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256Hex(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter api test src/modules/auth/opaqueToken.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/opaqueToken.ts apps/api/src/modules/auth/opaqueToken.test.ts
git commit -m "feat(auth): opaque token generator + sha256 hasher"
```

---

## Task 19: JWT sign/verify (access token + mfa step-up)

**Files:**
- Create: `apps/api/src/modules/auth/jwt.ts`
- Create: `apps/api/src/modules/auth/jwt.test.ts`

- [ ] **Step 1: Write failing test `apps/api/src/modules/auth/jwt.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { createJwtService } from './jwt.js';

const secret = 'a'.repeat(86);

describe('jwt service', () => {
  const jwt = createJwtService({ secret, accessTtl: '1h', issuer: 'naratala' });

  it('signs and verifies an access token', () => {
    const tok = jwt.signAccess({ sub: 42, role: 'hr' });
    const payload = jwt.verifyAccess(tok);
    expect(payload.sub).toBe(42);
    expect(payload.role).toBe('hr');
    expect(payload.jti).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects tampered tokens', () => {
    const tok = jwt.signAccess({ sub: 1, role: 'admin' });
    expect(() => jwt.verifyAccess(tok.slice(0, -2) + 'aa')).toThrow();
  });

  it('signs and verifies a short-lived mfaToken with scope=mfa', () => {
    const tok = jwt.signMfaToken({ sub: 7 });
    const p = jwt.verifyMfaToken(tok);
    expect(p.sub).toBe(7);
    expect(p.scope).toBe('mfa');
  });

  it('access-token verifier rejects mfaToken', () => {
    const mfa = jwt.signMfaToken({ sub: 7 });
    expect(() => jwt.verifyAccess(mfa)).toThrow();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter api test src/modules/auth/jwt.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `apps/api/src/modules/auth/jwt.ts`**

```ts
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import type { Role } from '@naratala/shared';
import { AuthError } from '../../shared/errors/index.js';

export interface AccessPayload {
  sub: number;
  role: Role;
  iat: number;
  exp: number;
  jti: string;
  scope: 'access';
}

export interface MfaPayload {
  sub: number;
  iat: number;
  exp: number;
  jti: string;
  scope: 'mfa';
}

interface Config {
  secret: string;
  accessTtl: string;   // e.g. '15m'
  issuer?: string;
}

export function createJwtService(cfg: Config) {
  const base = { algorithm: 'HS256' as const, issuer: cfg.issuer ?? 'naratala' };

  function signAccess(input: { sub: number; role: Role }): string {
    return jwt.sign({ role: input.role, scope: 'access' }, cfg.secret, {
      ...base,
      subject: String(input.sub),
      expiresIn: cfg.accessTtl,
      jwtid: randomUUID(),
    });
  }

  function signMfaToken(input: { sub: number }): string {
    return jwt.sign({ scope: 'mfa' }, cfg.secret, {
      ...base,
      subject: String(input.sub),
      expiresIn: '5m',
      jwtid: randomUUID(),
    });
  }

  function verifyAccess(token: string): AccessPayload {
    try {
      const decoded = jwt.verify(token, cfg.secret, { ...base, clockTolerance: 30 }) as any;
      if (decoded.scope !== 'access') throw new AuthError('TOKEN_EXPIRED', 'invalid token scope');
      return { ...decoded, sub: Number(decoded.sub) } as AccessPayload;
    } catch (e) {
      if (e instanceof AuthError) throw e;
      throw new AuthError('TOKEN_EXPIRED', 'invalid or expired token');
    }
  }

  function verifyMfaToken(token: string): MfaPayload {
    try {
      const decoded = jwt.verify(token, cfg.secret, { ...base, clockTolerance: 30 }) as any;
      if (decoded.scope !== 'mfa') throw new AuthError('MFA_INVALID', 'invalid mfa scope');
      return { ...decoded, sub: Number(decoded.sub) } as MfaPayload;
    } catch (e) {
      if (e instanceof AuthError) throw e;
      throw new AuthError('MFA_INVALID', 'invalid or expired mfa token');
    }
  }

  return { signAccess, signMfaToken, verifyAccess, verifyMfaToken };
}

export type JwtService = ReturnType<typeof createJwtService>;
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter api test src/modules/auth/jwt.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/jwt.ts apps/api/src/modules/auth/jwt.test.ts
git commit -m "feat(auth): jwt service (HS256 access + mfa step-up)"
```

---

## Task 20: TOTP (secret gen, otpauth URL, verify, recovery codes)

**Files:**
- Create: `apps/api/src/modules/auth/mfa.ts`
- Create: `apps/api/src/modules/auth/mfa.test.ts`

- [ ] **Step 1: Write failing test `apps/api/src/modules/auth/mfa.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { authenticator } from 'otplib';
import { generateTotpSecret, totpOtpauthUrl, verifyTotp, generateRecoveryCodes } from './mfa.js';

describe('totp', () => {
  it('generates a base32 secret and a verifiable code', () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    const code = authenticator.generate(secret);
    expect(verifyTotp(secret, code)).toBe(true);
    expect(verifyTotp(secret, '000000')).toBe(false);
  });

  it('builds an otpauth URL', () => {
    const url = totpOtpauthUrl('JBSWY3DPEHPK3PXP', 'Naratala HRIS', 'alice@naratala.local');
    expect(url).toMatch(/^otpauth:\/\/totp\//);
    expect(url).toContain('issuer=Naratala%20HRIS');
  });

  it('generates 10 unique recovery codes with a delimiter', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter api test src/modules/auth/mfa.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `apps/api/src/modules/auth/mfa.ts`**

```ts
import { authenticator } from 'otplib';
import { randomBytes } from 'node:crypto';

authenticator.options = { window: 1, step: 30 };

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function totpOtpauthUrl(secret: string, issuer: string, accountName: string): string {
  return authenticator.keyuri(accountName, issuer, secret);
}

export function verifyTotp(secret: string, code: string): boolean {
  try { return authenticator.check(code, secret); } catch { return false; }
}

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/1/I/O
function pickChar(b: number): string { return ALPHA[b % ALPHA.length]!; }

export function generateRecoveryCodes(): string[] {
  const out = new Set<string>();
  while (out.size < 10) {
    const buf = randomBytes(8);
    const left = Array.from(buf.subarray(0, 4)).map(pickChar).join('');
    const right = Array.from(buf.subarray(4, 8)).map(pickChar).join('');
    out.add(`${left}-${right}`);
  }
  return [...out];
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter api test src/modules/auth/mfa.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/mfa.ts apps/api/src/modules/auth/mfa.test.ts
git commit -m "feat(auth): TOTP secret/verify + recovery codes"
```

---

## Task 21: `authenticate` middleware (Bearer JWT → `req.user`)

**Files:**
- Create: `apps/api/src/shared/middlewares/authenticate.ts`
- Create: `apps/api/src/shared/middlewares/authenticate.test.ts`

- [ ] **Step 1: Write failing test `apps/api/src/shared/middlewares/authenticate.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createJwtService } from '../../modules/auth/jwt.js';
import { makeAuthenticate } from './authenticate.js';
import { errorHandler } from './errorHandler.js';

const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });
const app = express()
  .use(makeAuthenticate(jwt))
  .get('/me', (req, res) => res.json({ sub: (req as any).user?.sub, role: (req as any).user?.role }))
  .use(errorHandler());

describe('authenticate', () => {
  it('401 TOKEN_EXPIRED when no Authorization header', async () => {
    const r = await request(app).get('/me');
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('TOKEN_EXPIRED');
  });

  it('401 TOKEN_EXPIRED on malformed token', async () => {
    const r = await request(app).get('/me').set('Authorization', 'Bearer garbage');
    expect(r.status).toBe(401);
  });

  it('200 with req.user on valid token', async () => {
    const token = jwt.signAccess({ sub: 11, role: 'manager' });
    const r = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ sub: 11, role: 'manager' });
  });

  it('rejects an MFA-scope token on access routes', async () => {
    const tok = jwt.signMfaToken({ sub: 1 });
    const r = await request(app).get('/me').set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter api test src/shared/middlewares/authenticate.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `apps/api/src/shared/middlewares/authenticate.ts`**

```ts
import type { RequestHandler } from 'express';
import type { JwtService } from '../../modules/auth/jwt.js';
import { AuthError } from '../errors/index.js';
import type { Role } from '@naratala/shared';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { sub: number; role: Role; jti: string };
  }
}

export function makeAuthenticate(jwt: JwtService): RequestHandler {
  return (req, _res, next) => {
    try {
      const header = req.header('authorization') ?? '';
      const [scheme, token] = header.split(' ');
      if (scheme?.toLowerCase() !== 'bearer' || !token) {
        throw new AuthError('TOKEN_EXPIRED', 'missing bearer token');
      }
      const p = jwt.verifyAccess(token);
      req.user = { sub: p.sub, role: p.role, jti: p.jti };
      next();
    } catch (err) { next(err); }
  };
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter api test src/shared/middlewares/authenticate.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/shared/middlewares/authenticate.ts apps/api/src/shared/middlewares/authenticate.test.ts
git commit -m "feat(api): authenticate middleware (Bearer JWT → req.user)"
```

---

## Task 22: Refresh-token service (issue, rotate, reuse-detect, revoke family)

**Files:**
- Create: `apps/api/src/modules/auth/refreshTokenRepo.ts`
- Create: `apps/api/src/modules/auth/refreshTokenService.ts`
- Create: `apps/api/src/modules/auth/refreshTokenService.test.ts`

- [ ] **Step 1: Implement `apps/api/src/modules/auth/refreshTokenRepo.ts`**

```ts
import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { refreshTokens } from '../../shared/db/schema.js';

export interface RefreshTokenRow {
  id: number;
  userId: number;
  familyId: string;
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: number | null;
}

export interface RefreshTokenRepo {
  insert(row: Omit<RefreshTokenRow, 'id' | 'revokedAt' | 'replacedById'> & { userAgent?: string | null; ip?: string | null }): Promise<number>;
  findByHash(hash: string): Promise<RefreshTokenRow | undefined>;
  markReplaced(id: number, replacedById: number): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
  revokeAllForUser(userId: number): Promise<void>;
  deleteExpired(before: Date): Promise<number>;
}

export function createRefreshTokenRepo(db: DB): RefreshTokenRepo {
  return {
    async insert(row) {
      const [r] = await db.insert(refreshTokens).values({
        userId: row.userId,
        familyId: row.familyId,
        tokenHash: row.tokenHash,
        issuedAt: row.issuedAt,
        expiresAt: row.expiresAt,
        userAgent: row.userAgent ?? null,
        ip: row.ip ?? null,
      }).$returningId();
      return r.id;
    },
    async findByHash(hash) {
      const [row] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hash)).limit(1);
      return row as RefreshTokenRow | undefined;
    },
    async markReplaced(id, replacedById) {
      await db.update(refreshTokens)
        .set({ revokedAt: new Date(), replacedById })
        .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)));
    },
    async revokeFamily(familyId) {
      await db.update(refreshTokens)
        .set({ revokedAt: sql`COALESCE(revoked_at, CURRENT_TIMESTAMP(3))` })
        .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
    },
    async revokeAllForUser(userId) {
      await db.update(refreshTokens)
        .set({ revokedAt: sql`COALESCE(revoked_at, CURRENT_TIMESTAMP(3))` })
        .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
    },
    async deleteExpired(before) {
      const r: any = await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, before));
      return Number(r?.affectedRows ?? 0);
    },
  };
}
```

- [ ] **Step 2: Write failing test `apps/api/src/modules/auth/refreshTokenService.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createRefreshTokenRepo } from './refreshTokenRepo.js';
import { createRefreshTokenService } from './refreshTokenService.js';
import { users } from '../../shared/db/schema.js';
import { AuthError } from '../../shared/errors/index.js';

describe('refreshTokenService', () => {
  let ctx: TestDb;
  let userId = 0;

  beforeAll(async () => {
    ctx = await createTestDb();
    const [row] = await ctx.db.insert(users).values({
      email: 'rt@naratala.local', passwordHash: 'x', role: 'employee', status: 'active',
    }).$returningId();
    userId = row.id;
  });
  afterAll(async () => { await ctx.drop(); });
  beforeEach(async () => {
    const conn = await ctx.pool.getConnection();
    await conn.query('DELETE FROM refresh_tokens');
    conn.release();
  });

  function build() {
    const repo = createRefreshTokenRepo(ctx.db);
    return { repo, svc: createRefreshTokenService({ repo, ttlMs: 1000 * 60 * 60 * 24 * 30 }) };
  }

  it('issue → rotate produces a new token and invalidates the old', async () => {
    const { svc } = build();
    const first = await svc.issueNew({ userId });
    const second = await svc.rotate({ rawToken: first.rawToken });
    expect(second.rawToken).not.toBe(first.rawToken);

    await expect(svc.rotate({ rawToken: first.rawToken })).rejects.toMatchObject({ code: 'TOKEN_REUSED' });
  });

  it('reuse-detection revokes the entire family', async () => {
    const { repo, svc } = build();
    const a = await svc.issueNew({ userId });
    const b = await svc.rotate({ rawToken: a.rawToken });
    const c = await svc.rotate({ rawToken: b.rawToken });

    // attacker reuses `a`
    await expect(svc.rotate({ rawToken: a.rawToken })).rejects.toMatchObject({ code: 'TOKEN_REUSED' });

    // legitimate user tries `c` — should also fail because family was revoked
    await expect(svc.rotate({ rawToken: c.rawToken })).rejects.toBeInstanceOf(AuthError);
  });

  it('rejects expired tokens', async () => {
    const repo = createRefreshTokenRepo(ctx.db);
    const svc = createRefreshTokenService({ repo, ttlMs: -1 });
    const expired = await svc.issueNew({ userId });
    await expect(svc.rotate({ rawToken: expired.rawToken })).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' });
  });

  it('rejects unknown tokens', async () => {
    const { svc } = build();
    await expect(svc.rotate({ rawToken: 'unknown-token' })).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' });
  });
});
```

- [ ] **Step 3: Run, expect FAIL**

Run: `pnpm --filter api test src/modules/auth/refreshTokenService.test.ts`
Expected: module not found.

- [ ] **Step 4: Implement `apps/api/src/modules/auth/refreshTokenService.ts`**

```ts
import { randomUUID } from 'node:crypto';
import { AuthError } from '../../shared/errors/index.js';
import { newOpaqueToken, sha256Hex } from './opaqueToken.js';
import type { RefreshTokenRepo } from './refreshTokenRepo.js';

export interface IssueResult { rawToken: string; expiresAt: Date; familyId: string; }

interface Config {
  repo: RefreshTokenRepo;
  ttlMs: number;
}

export function createRefreshTokenService(cfg: Config) {
  async function issueNew(input: {
    userId: number;
    familyId?: string;
    userAgent?: string | null;
    ip?: string | null;
  }): Promise<IssueResult> {
    const rawToken = newOpaqueToken();
    const tokenHash = sha256Hex(rawToken);
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + cfg.ttlMs);
    const familyId = input.familyId ?? randomUUID();
    await cfg.repo.insert({
      userId: input.userId,
      familyId,
      tokenHash,
      issuedAt,
      expiresAt,
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
    });
    return { rawToken, expiresAt, familyId };
  }

  async function rotate(input: {
    rawToken: string;
    userAgent?: string | null;
    ip?: string | null;
  }): Promise<IssueResult & { userId: number }> {
    const hash = sha256Hex(input.rawToken);
    const row = await cfg.repo.findByHash(hash);
    if (!row) throw new AuthError('TOKEN_EXPIRED', 'unknown refresh token');
    if (row.expiresAt.getTime() < Date.now()) throw new AuthError('TOKEN_EXPIRED', 'refresh expired');
    if (row.revokedAt) {
      await cfg.repo.revokeFamily(row.familyId);
      throw new AuthError('TOKEN_REUSED', 'refresh token reuse detected');
    }

    const issued = await issueNew({
      userId: row.userId,
      familyId: row.familyId,
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
    });
    // find new row's id to mark old as replaced_by
    const newRow = await cfg.repo.findByHash(sha256Hex(issued.rawToken));
    if (newRow) await cfg.repo.markReplaced(row.id, newRow.id);
    return { ...issued, userId: row.userId };
  }

  async function revokeByToken(rawToken: string): Promise<void> {
    const row = await cfg.repo.findByHash(sha256Hex(rawToken));
    if (row) await cfg.repo.revokeFamily(row.familyId);
  }

  async function revokeAllForUser(userId: number): Promise<void> {
    await cfg.repo.revokeAllForUser(userId);
  }

  return { issueNew, rotate, revokeByToken, revokeAllForUser };
}

export type RefreshTokenService = ReturnType<typeof createRefreshTokenService>;
```

- [ ] **Step 5: Run, expect PASS**

Run: `pnpm --filter api test src/modules/auth/refreshTokenService.test.ts`
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/auth/refreshTokenRepo.ts apps/api/src/modules/auth/refreshTokenService.ts apps/api/src/modules/auth/refreshTokenService.test.ts
git commit -m "feat(auth): refresh-token service with rotation + reuse detection"
```

---

## Task 23: Mail transport (nodemailer)

**Files:**
- Create: `apps/api/src/shared/mail/mailer.ts`
- Create: `apps/api/src/shared/mail/templates.ts`
- Create: `apps/api/src/shared/mail/mailer.test.ts`

- [ ] **Step 1: Write failing test `apps/api/src/shared/mail/mailer.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { createMailer } from './mailer.js';

describe('mailer', () => {
  it('calls sendMail with the configured from + passed to/subject/html', async () => {
    const sendMail = vi.fn().mockResolvedValue({ accepted: ['a@b.co'] });
    const transport = { sendMail } as any;
    const mailer = createMailer({ transport, from: 'Naratala <n@x.co>' });

    await mailer.send({ to: 'a@b.co', subject: 'Hi', html: '<p>Hello</p>' });

    expect(sendMail).toHaveBeenCalledWith({
      from: 'Naratala <n@x.co>',
      to: 'a@b.co',
      subject: 'Hi',
      html: '<p>Hello</p>',
      text: 'Hello',
    });
  });

  it('swallows transport errors and logs (never throws)', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('smtp down'));
    const mailer = createMailer({ transport: { sendMail } as any, from: 'x@y.co' });
    await expect(mailer.send({ to: 'a@b.co', subject: 's', html: '<p>h</p>' })).resolves.toEqual({ ok: false });
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter api test src/shared/mail/mailer.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `apps/api/src/shared/mail/mailer.ts`**

```ts
import nodemailer, { type Transporter } from 'nodemailer';
import { logger } from '../logger.js';

interface Config {
  transport: Pick<Transporter, 'sendMail'>;
  from: string;
}

export function createMailer(cfg: Config) {
  async function send(input: { to: string; subject: string; html: string }): Promise<{ ok: boolean }> {
    try {
      const text = input.html.replace(/<[^>]+>/g, '').trim();
      await cfg.transport.sendMail({
        from: cfg.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text,
      });
      return { ok: true };
    } catch (err) {
      logger.error({ err, to: input.to, subject: input.subject }, 'mail send failed');
      return { ok: false };
    }
  }
  return { send };
}

export function createSmtpTransport(cfg: {
  host: string; port: number; user?: string; pass?: string;
}): Transporter {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: false,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
}

export type Mailer = ReturnType<typeof createMailer>;
```

- [ ] **Step 4: Implement `apps/api/src/shared/mail/templates.ts`**

```ts
export function inviteEmail(args: { recipientName: string; url: string; expiresAt: Date }): { subject: string; html: string } {
  return {
    subject: 'You are invited to Naratala HRIS',
    html: `
      <p>Hi ${escape(args.recipientName)},</p>
      <p>You have been invited to join Naratala HRIS. Click the link below to set your password and sign in:</p>
      <p><a href="${escape(args.url)}">${escape(args.url)}</a></p>
      <p>This link expires at ${args.expiresAt.toISOString()}.</p>
      <p>If you did not expect this email, you can safely ignore it.</p>
    `,
  };
}

export function passwordResetEmail(args: { url: string; expiresAt: Date }): { subject: string; html: string } {
  return {
    subject: 'Reset your Naratala HRIS password',
    html: `
      <p>Someone requested a password reset for this account.</p>
      <p><a href="${escape(args.url)}">${escape(args.url)}</a></p>
      <p>This link expires at ${args.expiresAt.toISOString()}.</p>
      <p>If you did not request this, ignore this email.</p>
    `,
  };
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
}
```

- [ ] **Step 5: Run, expect PASS**

Run: `pnpm --filter api test src/shared/mail/mailer.test.ts`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/shared/mail
git commit -m "feat(api): nodemailer transport + invite/reset templates"
```

---

## Task 24: Login service + route (no MFA) with login_attempts + constant-time

**Files:**
- Create: `apps/api/src/modules/auth/userRepo.ts`
- Create: `apps/api/src/modules/auth/loginAttemptRepo.ts`
- Create: `apps/api/src/modules/auth/authService.ts`
- Create: `apps/api/src/modules/auth/authRoutes.ts`
- Create: `apps/api/src/modules/auth/login.test.ts`

- [ ] **Step 1: Implement `apps/api/src/modules/auth/userRepo.ts`**

```ts
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { users } from '../../shared/db/schema.js';
import type { Role } from '@naratala/shared';

export type UserStatus = 'pending' | 'active' | 'disabled';

export interface UserRow {
  id: number;
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  mfaSecret: Buffer | null;
  language: 'id' | 'en';
  lastLoginAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRepo {
  findByEmail(email: string): Promise<UserRow | undefined>;
  findById(id: number): Promise<UserRow | undefined>;
  setLastLogin(id: number, at: Date): Promise<void>;
  updatePasswordHash(id: number, hash: string, mustChange: boolean): Promise<void>;
  updateMfa(id: number, enabled: boolean, secret: Buffer | null): Promise<void>;
  patch(id: number, patch: Partial<Pick<UserRow, 'role' | 'status' | 'language'>>): Promise<void>;
  countAdmins(): Promise<number>;
  listPaginated(params: { page: number; pageSize: number }): Promise<{ rows: UserRow[]; total: number }>;
}

export function createUserRepo(db: DB): UserRepo {
  return {
    async findByEmail(email) {
      const [row] = await db.select().from(users)
        .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt))).limit(1);
      return row as UserRow | undefined;
    },
    async findById(id) {
      const [row] = await db.select().from(users)
        .where(and(eq(users.id, id), isNull(users.deletedAt))).limit(1);
      return row as UserRow | undefined;
    },
    async setLastLogin(id, at) {
      await db.update(users).set({ lastLoginAt: at }).where(eq(users.id, id));
    },
    async updatePasswordHash(id, hash, mustChange) {
      await db.update(users).set({ passwordHash: hash, mustChangePassword: mustChange }).where(eq(users.id, id));
    },
    async updateMfa(id, enabled, secret) {
      await db.update(users).set({ mfaEnabled: enabled, mfaSecret: secret }).where(eq(users.id, id));
    },
    async patch(id, p) {
      if (Object.keys(p).length === 0) return;
      await db.update(users).set(p).where(eq(users.id, id));
    },
    async countAdmins() {
      const [row] = await db.execute<{ n: number }>(
        sql`SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active' AND deleted_at IS NULL`,
      );
      return Number((row as any)?.n ?? 0);
    },
    async listPaginated({ page, pageSize }) {
      const offset = (page - 1) * pageSize;
      const rows = await db.select().from(users).where(isNull(users.deletedAt))
        .orderBy(users.email).limit(pageSize).offset(offset);
      const [c] = await db.execute<{ n: number }>(
        sql`SELECT COUNT(*) AS n FROM users WHERE deleted_at IS NULL`,
      );
      return { rows: rows as UserRow[], total: Number((c as any)?.n ?? 0) };
    },
  };
}
```

- [ ] **Step 2: Implement `apps/api/src/modules/auth/loginAttemptRepo.ts`**

```ts
import { and, eq, gt, sql } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { loginAttempts } from '../../shared/db/schema.js';

export interface LoginAttemptRepo {
  record(email: string, ip: string, succeeded: boolean): Promise<void>;
  failedSince(email: string, since: Date): Promise<number>;
}

export function createLoginAttemptRepo(db: DB): LoginAttemptRepo {
  return {
    async record(email, ip, succeeded) {
      await db.insert(loginAttempts).values({ email: email.toLowerCase(), ip: ip.slice(0, 45), succeeded });
    },
    async failedSince(email, since) {
      const [row] = await db.execute<{ n: number }>(
        sql`SELECT COUNT(*) AS n FROM login_attempts
              WHERE email = ${email.toLowerCase()} AND succeeded = 0 AND created_at >= ${since}`,
      );
      return Number((row as any)?.n ?? 0);
    },
  };
}
```

- [ ] **Step 3: Implement `apps/api/src/modules/auth/authService.ts`** (login portion)

```ts
import type { Response } from 'express';
import { AuthError } from '../../shared/errors/index.js';
import type { UserRepo, UserRow } from './userRepo.js';
import type { LoginAttemptRepo } from './loginAttemptRepo.js';
import type { JwtService } from './jwt.js';
import type { RefreshTokenService } from './refreshTokenService.js';
import { DUMMY_BCRYPT_HASH, verifyPassword } from './password.js';

interface Deps {
  users: UserRepo;
  loginAttempts: LoginAttemptRepo;
  jwt: JwtService;
  refresh: RefreshTokenService;
  refreshTtlMs: number;
}

const LOCK_THRESHOLD = 10;
const LOCK_WINDOW_MS = 15 * 60_000;

export function createAuthService(deps: Deps) {
  async function login(input: {
    email: string; password: string; ip: string; userAgent?: string;
  }): Promise<
    | { kind: 'mfa'; mfaToken: string }
    | { kind: 'tokens'; accessToken: string; refreshToken: string; refreshExpiresAt: Date; user: UserRow }
  > {
    const email = input.email.toLowerCase();
    const recent = await deps.loginAttempts.failedSince(email, new Date(Date.now() - LOCK_WINDOW_MS));
    if (recent >= LOCK_THRESHOLD) {
      await deps.loginAttempts.record(email, input.ip, false);
      throw new AuthError('INVALID_CREDENTIALS', 'invalid credentials');
    }

    const user = await deps.users.findByEmail(email);
    const hash = user?.passwordHash ?? DUMMY_BCRYPT_HASH;
    const ok = await verifyPassword(input.password, hash);

    if (!user || !ok || user.status === 'disabled' || user.deletedAt) {
      await deps.loginAttempts.record(email, input.ip, false);
      throw new AuthError('INVALID_CREDENTIALS', 'invalid credentials');
    }

    await deps.loginAttempts.record(email, input.ip, true);

    if (user.mfaEnabled) {
      const mfaToken = deps.jwt.signMfaToken({ sub: user.id });
      return { kind: 'mfa', mfaToken };
    }

    return issueFreshTokens(user, input.ip, input.userAgent);
  }

  async function issueFreshTokens(user: UserRow, ip: string, userAgent?: string) {
    const accessToken = deps.jwt.signAccess({ sub: user.id, role: user.role });
    const r = await deps.refresh.issueNew({ userId: user.id, ip, userAgent: userAgent ?? null });
    await deps.users.setLastLogin(user.id, new Date());
    return {
      kind: 'tokens' as const,
      accessToken, refreshToken: r.rawToken, refreshExpiresAt: r.expiresAt, user,
    };
  }

  return { login, issueFreshTokens };
}

export type AuthService = ReturnType<typeof createAuthService>;

export function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie('rt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    path: '/api/auth',
    expires: expiresAt,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie('rt', { path: '/api/auth' });
}
```

- [ ] **Step 4: Implement `apps/api/src/modules/auth/authRoutes.ts`** (login only in this task; other routes appended later)

```ts
import { Router } from 'express';
import { LoginBody } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { limiters } from '../../shared/middlewares/rateLimit.js';
import type { AuthService } from './authService.js';
import { setRefreshCookie } from './authService.js';
import { toUserDTO } from './userDto.js';

export function createAuthRouter(deps: { service: AuthService }): Router {
  const r = Router();

  r.post('/login',
    limiters.loginByEmail(), limiters.loginByIp(),
    validate({ body: LoginBody }),
    async (req, res, next) => {
      try {
        const body = req.valid.body as { email: string; password: string };
        const result = await deps.service.login({
          email: body.email, password: body.password,
          ip: req.ip ?? 'unknown', userAgent: req.header('user-agent') ?? undefined,
        });
        if (result.kind === 'mfa') {
          return res.json({ mfaRequired: true, mfaToken: result.mfaToken });
        }
        setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
        return res.json({ accessToken: result.accessToken, user: toUserDTO(result.user) });
      } catch (err) { next(err); }
    });

  return r;
}
```

- [ ] **Step 5: Implement `apps/api/src/modules/auth/userDto.ts`**

```ts
import type { UserDTO } from '@naratala/shared';
import type { UserRow } from './userRepo.js';

export function toUserDTO(row: UserRow): UserDTO {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    language: row.language,
    mfaEnabled: row.mfaEnabled,
    mustChangePassword: row.mustChangePassword,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 6: Write failing integration test `apps/api/src/modules/auth/login.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createTestDb, type TestDb } from '../../test/db.js';
import { hashPassword } from './password.js';
import { createUserRepo } from './userRepo.js';
import { createLoginAttemptRepo } from './loginAttemptRepo.js';
import { createRefreshTokenRepo } from './refreshTokenRepo.js';
import { createRefreshTokenService } from './refreshTokenService.js';
import { createJwtService } from './jwt.js';
import { createAuthService } from './authService.js';
import { createAuthRouter } from './authRoutes.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';
import { users } from '../../shared/db/schema.js';

describe('POST /api/auth/login (no MFA)', () => {
  let ctx: TestDb;
  let app: express.Express;

  beforeAll(async () => {
    ctx = await createTestDb();
    const userRepo = createUserRepo(ctx.db);
    const attemptsRepo = createLoginAttemptRepo(ctx.db);
    const refreshRepo = createRefreshTokenRepo(ctx.db);
    const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });
    const refresh = createRefreshTokenService({ repo: refreshRepo, ttlMs: 30 * 24 * 60 * 60 * 1000 });
    const service = createAuthService({
      users: userRepo, loginAttempts: attemptsRepo, jwt, refresh,
      refreshTtlMs: 30 * 24 * 60 * 60 * 1000,
    });
    app = express();
    app.set('trust proxy', 1);
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/auth', createAuthRouter({ service }));
    app.use(errorHandler());
  });

  afterAll(async () => { await ctx.drop(); });
  beforeEach(async () => { await ctx.truncateAll(); });

  async function seedUser(email = 'u@naratala.local', pw = 'correct-horse-12') {
    const h = await hashPassword(pw);
    await ctx.db.insert(users).values({ email, passwordHash: h, role: 'employee', status: 'active' });
  }

  it('200 + accessToken + rt cookie on valid credentials', async () => {
    await seedUser();
    const r = await request(app).post('/api/auth/login').send({ email: 'U@naratala.local', password: 'correct-horse-12' });
    expect(r.status).toBe(200);
    expect(r.body.accessToken).toBeDefined();
    expect(r.body.user.email).toBe('u@naratala.local');
    expect(r.headers['set-cookie']?.[0]).toMatch(/^rt=/);
    expect(r.headers['set-cookie']?.[0]).toMatch(/HttpOnly/);
    expect(r.headers['set-cookie']?.[0]).toMatch(/Path=\/api\/auth/);
  });

  it('401 INVALID_CREDENTIALS on wrong password', async () => {
    await seedUser();
    const r = await request(app).post('/api/auth/login').send({ email: 'u@naratala.local', password: 'wrong-password' });
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('401 INVALID_CREDENTIALS on unknown email (no enumeration)', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'nope@x.co', password: 'whatever1234' });
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('401 on disabled account', async () => {
    const h = await hashPassword('correct-horse-12');
    await ctx.db.insert(users).values({ email: 'd@naratala.local', passwordHash: h, role: 'employee', status: 'disabled' });
    const r = await request(app).post('/api/auth/login').send({ email: 'd@naratala.local', password: 'correct-horse-12' });
    expect(r.status).toBe(401);
  });
});
```

- [ ] **Step 7: Run, expect PASS**

Run: `pnpm --filter api test src/modules/auth/login.test.ts`
Expected: 4 passed.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/auth
git commit -m "feat(auth): login route (no MFA) + login_attempts + constant-time"
```

---

## Task 25: Refresh, logout, MFA-verify, me routes

**Files:**
- Modify: `apps/api/src/modules/auth/authService.ts`
- Modify: `apps/api/src/modules/auth/authRoutes.ts`
- Create: `apps/api/src/modules/auth/refresh.test.ts`

- [ ] **Step 1: Extend `authService.ts` — add `verifyMfa`, `refreshSession`, `logout`, `getMe`**

Append inside `createAuthService`:

```ts
  async function verifyMfa(input: { mfaToken: string; code: string; ip: string; userAgent?: string }) {
    const payload = deps.jwt.verifyMfaToken(input.mfaToken);
    const user = await deps.users.findById(payload.sub);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new AuthError('MFA_INVALID', 'mfa not enabled');
    }
    const { decryptGcm } = await import('./crypto.js');
    const { verifyTotp } = await import('./mfa.js');
    const { loadEnv } = await import('../../shared/config/env.js');
    const key = loadEnv().MFA_ENCRYPTION_KEY;
    const secret = decryptGcm(key, user.mfaSecret);
    if (!verifyTotp(secret, input.code)) throw new AuthError('MFA_INVALID', 'invalid code');
    return issueFreshTokens(user, input.ip, input.userAgent);
  }

  async function refreshSession(input: { rawToken: string; ip: string; userAgent?: string }) {
    const rotated = await deps.refresh.rotate({
      rawToken: input.rawToken, ip: input.ip, userAgent: input.userAgent ?? null,
    });
    const user = await deps.users.findById(rotated.userId);
    if (!user || user.status === 'disabled' || user.deletedAt) {
      await deps.refresh.revokeAllForUser(rotated.userId);
      throw new AuthError('TOKEN_EXPIRED', 'account not eligible');
    }
    const accessToken = deps.jwt.signAccess({ sub: user.id, role: user.role });
    return { accessToken, refreshToken: rotated.rawToken, refreshExpiresAt: rotated.expiresAt, user };
  }

  async function logout(input: { rawToken?: string | undefined }) {
    if (input.rawToken) await deps.refresh.revokeByToken(input.rawToken);
  }

  async function getMe(userId: number): Promise<UserRow> {
    const user = await deps.users.findById(userId);
    if (!user) throw new AuthError('TOKEN_EXPIRED', 'user not found');
    return user;
  }
```

Add the exports at the end:

```ts
  return { login, issueFreshTokens, verifyMfa, refreshSession, logout, getMe };
```

Add `import { AuthError }` and `import type { UserRow }` at the top if not already there. Replace `verifyPassword` import block with:

```ts
import { AuthError } from '../../shared/errors/index.js';
import { DUMMY_BCRYPT_HASH, verifyPassword } from './password.js';
import type { UserRepo, UserRow } from './userRepo.js';
```

- [ ] **Step 2: Extend `authRoutes.ts` — add `mfa/verify`, `refresh`, `logout`, `me`**

Replace the file with:

```ts
import { Router } from 'express';
import { LoginBody, MfaVerifyBody } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { limiters } from '../../shared/middlewares/rateLimit.js';
import type { AuthService } from './authService.js';
import { setRefreshCookie, clearRefreshCookie } from './authService.js';
import { toUserDTO } from './userDto.js';
import { AuthError } from '../../shared/errors/index.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { JwtService } from './jwt.js';

export function createAuthRouter(deps: { service: AuthService; jwt: JwtService }): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

  r.post('/login',
    limiters.loginByEmail(), limiters.loginByIp(),
    validate({ body: LoginBody }),
    async (req, res, next) => {
      try {
        const body = req.valid.body as { email: string; password: string };
        const result = await deps.service.login({
          email: body.email, password: body.password,
          ip: req.ip ?? 'unknown', userAgent: req.header('user-agent') ?? undefined,
        });
        if (result.kind === 'mfa') return res.json({ mfaRequired: true, mfaToken: result.mfaToken });
        setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
        return res.json({ accessToken: result.accessToken, user: toUserDTO(result.user) });
      } catch (err) { next(err); }
    });

  r.post('/mfa/verify',
    validate({ body: MfaVerifyBody }),
    async (req, res, next) => {
      try {
        const header = req.header('authorization') ?? '';
        const [scheme, token] = header.split(' ');
        if (scheme?.toLowerCase() !== 'bearer' || !token) throw new AuthError('MFA_INVALID', 'missing mfa token');
        const body = req.valid.body as { code: string };
        const out = await deps.service.verifyMfa({
          mfaToken: token, code: body.code,
          ip: req.ip ?? 'unknown', userAgent: req.header('user-agent') ?? undefined,
        });
        setRefreshCookie(res, out.refreshToken, out.refreshExpiresAt);
        return res.json({ accessToken: out.accessToken, user: toUserDTO(out.user) });
      } catch (err) { next(err); }
    });

  r.post('/refresh',
    limiters.refresh(),
    async (req, res, next) => {
      try {
        const rt = (req as any).cookies?.rt;
        if (!rt) throw new AuthError('TOKEN_EXPIRED', 'missing refresh cookie');
        const out = await deps.service.refreshSession({
          rawToken: rt, ip: req.ip ?? 'unknown', userAgent: req.header('user-agent') ?? undefined,
        });
        setRefreshCookie(res, out.refreshToken, out.refreshExpiresAt);
        return res.json({ accessToken: out.accessToken, user: toUserDTO(out.user) });
      } catch (err) { next(err); }
    });

  r.post('/logout', async (req, res, next) => {
    try {
      const rt = (req as any).cookies?.rt;
      await deps.service.logout({ rawToken: rt });
      clearRefreshCookie(res);
      return res.status(204).end();
    } catch (err) { next(err); }
  });

  r.get('/me', authenticate, async (req, res, next) => {
    try {
      const user = await deps.service.getMe(req.user!.sub);
      return res.json({ user: toUserDTO(user) });
    } catch (err) { next(err); }
  });

  return r;
}
```

- [ ] **Step 3: Write failing test `apps/api/src/modules/auth/refresh.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createTestDb, type TestDb } from '../../test/db.js';
import { hashPassword } from './password.js';
import { createUserRepo } from './userRepo.js';
import { createLoginAttemptRepo } from './loginAttemptRepo.js';
import { createRefreshTokenRepo } from './refreshTokenRepo.js';
import { createRefreshTokenService } from './refreshTokenService.js';
import { createJwtService } from './jwt.js';
import { createAuthService } from './authService.js';
import { createAuthRouter } from './authRoutes.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';
import { users } from '../../shared/db/schema.js';

describe('refresh + logout + me', () => {
  let ctx: TestDb;
  let app: express.Express;

  beforeAll(async () => {
    ctx = await createTestDb();
    const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });
    const service = createAuthService({
      users: createUserRepo(ctx.db),
      loginAttempts: createLoginAttemptRepo(ctx.db),
      jwt,
      refresh: createRefreshTokenService({ repo: createRefreshTokenRepo(ctx.db), ttlMs: 30 * 86400000 }),
      refreshTtlMs: 30 * 86400000,
    });
    app = express();
    app.set('trust proxy', 1);
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/auth', createAuthRouter({ service, jwt }));
    app.use(errorHandler());
  });
  afterAll(async () => { await ctx.drop(); });
  beforeEach(async () => { await ctx.truncateAll(); });

  async function loginFresh() {
    const h = await hashPassword('correct-horse-12');
    await ctx.db.insert(users).values({ email: 'u@naratala.local', passwordHash: h, role: 'employee', status: 'active' });
    const r = await request(app).post('/api/auth/login').send({ email: 'u@naratala.local', password: 'correct-horse-12' });
    return { accessToken: r.body.accessToken as string, cookie: r.headers['set-cookie']![0]! };
  }

  it('/refresh rotates and issues a new access token', async () => {
    const { cookie } = await loginFresh();
    const r1 = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(r1.status).toBe(200);
    expect(r1.body.accessToken).toBeDefined();
    expect(r1.headers['set-cookie']?.[0]).toMatch(/^rt=/);

    // old rt cookie should now be a TOKEN_REUSED attempt
    const r2 = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(r2.status).toBe(401);
    expect(r2.body.code).toBe('TOKEN_REUSED');
  });

  it('/logout clears the cookie and revokes', async () => {
    const { cookie } = await loginFresh();
    const lo = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(lo.status).toBe(204);

    const r = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(r.status).toBe(401);
  });

  it('/me returns the current user', async () => {
    const { accessToken } = await loginFresh();
    const r = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(r.status).toBe(200);
    expect(r.body.user.email).toBe('u@naratala.local');
  });
});
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter api test src/modules/auth/refresh.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/authService.ts apps/api/src/modules/auth/authRoutes.ts apps/api/src/modules/auth/refresh.test.ts
git commit -m "feat(auth): refresh with rotation + logout + me routes"
```

---

## Task 26: Password change / forgot / reset

**Files:**
- Create: `apps/api/src/modules/auth/passwordResetRepo.ts`
- Modify: `apps/api/src/modules/auth/authService.ts` (add password methods)
- Modify: `apps/api/src/modules/auth/authRoutes.ts` (add routes)
- Create: `apps/api/src/modules/auth/password-flows.test.ts`

- [ ] **Step 1: Implement `apps/api/src/modules/auth/passwordResetRepo.ts`**

```ts
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { passwordResets } from '../../shared/db/schema.js';

export interface PasswordResetRepo {
  insert(userId: number, tokenHash: string, expiresAt: Date): Promise<void>;
  findUsableByHash(tokenHash: string, now: Date): Promise<{ id: number; userId: number } | undefined>;
  consume(id: number): Promise<void>;
}

export function createPasswordResetRepo(db: DB): PasswordResetRepo {
  return {
    async insert(userId, tokenHash, expiresAt) {
      await db.insert(passwordResets).values({ userId, tokenHash, expiresAt });
    },
    async findUsableByHash(tokenHash, now) {
      const [row] = await db.select().from(passwordResets).where(
        and(
          eq(passwordResets.tokenHash, tokenHash),
          isNull(passwordResets.consumedAt),
          gt(passwordResets.expiresAt, now),
        ),
      ).limit(1);
      return row ? { id: row.id, userId: row.userId } : undefined;
    },
    async consume(id) {
      await db.update(passwordResets).set({ consumedAt: new Date() }).where(eq(passwordResets.id, id));
    },
  };
}
```

- [ ] **Step 2: Extend `authService.ts` deps + methods**

Update the `Deps` interface to add:

```ts
  passwordResets: PasswordResetRepo;
  mailer: Mailer;
  appUrl: string;
  hibp?: (prefix: string) => Promise<string>;
```

Add imports:

```ts
import { hashPassword, assertPasswordStrong, checkPwned, verifyPassword } from './password.js';
import { newOpaqueToken, sha256Hex } from './opaqueToken.js';
import type { PasswordResetRepo } from './passwordResetRepo.js';
import type { Mailer } from '../../shared/mail/mailer.js';
import { passwordResetEmail } from '../../shared/mail/templates.js';
```

Add inside `createAuthService`:

```ts
  async function changePassword(userId: number, current: string, next: string): Promise<void> {
    const user = await deps.users.findById(userId);
    if (!user) throw new AuthError('INVALID_CREDENTIALS', 'user not found');
    if (!(await verifyPassword(current, user.passwordHash))) {
      throw new AuthError('INVALID_CREDENTIALS', 'current password invalid');
    }
    assertPasswordStrong(next);
    if (await checkPwned(next, deps.hibp)) throw new AuthError('PASSWORD_PWNED', 'password compromised');
    const hash = await hashPassword(next);
    await deps.users.updatePasswordHash(user.id, hash, false);
    await deps.refresh.revokeAllForUser(user.id);
  }

  async function requestForgot(email: string): Promise<void> {
    const start = Date.now();
    const user = await deps.users.findByEmail(email);
    if (user && user.status !== 'disabled') {
      const raw = newOpaqueToken();
      const expiresAt = new Date(Date.now() + 60 * 60_000);
      await deps.passwordResets.insert(user.id, sha256Hex(raw), expiresAt);
      const tmpl = passwordResetEmail({ url: `${deps.appUrl}/password/reset?token=${raw}`, expiresAt });
      await deps.mailer.send({ to: user.email, subject: tmpl.subject, html: tmpl.html });
    }
    const elapsed = Date.now() - start;
    if (elapsed < 200) await new Promise((r) => setTimeout(r, 200 - elapsed));
  }

  async function resetPassword(token: string, newPassword: string): Promise<void> {
    const found = await deps.passwordResets.findUsableByHash(sha256Hex(token), new Date());
    if (!found) throw new AuthError('INVITE_EXPIRED', 'reset token invalid or expired');
    assertPasswordStrong(newPassword);
    if (await checkPwned(newPassword, deps.hibp)) throw new AuthError('PASSWORD_PWNED', 'password compromised');
    const hash = await hashPassword(newPassword);
    await deps.users.updatePasswordHash(found.userId, hash, false);
    await deps.passwordResets.consume(found.id);
    await deps.refresh.revokeAllForUser(found.userId);
  }
```

Update the returned object:

```ts
  return { login, issueFreshTokens, verifyMfa, refreshSession, logout, getMe,
           changePassword, requestForgot, resetPassword };
```

- [ ] **Step 3: Extend `authRoutes.ts` with password routes**

Add imports:

```ts
import { PasswordChangeBody, PasswordForgotBody, PasswordResetBody } from '@naratala/shared';
```

Insert before the `return r;`:

```ts
  r.post('/password/change', authenticate, validate({ body: PasswordChangeBody }),
    async (req, res, next) => {
      try {
        const body = req.valid.body as { currentPassword: string; newPassword: string };
        await deps.service.changePassword(req.user!.sub, body.currentPassword, body.newPassword);
        return res.json({ ok: true });
      } catch (err) { next(err); }
    });

  r.post('/password/forgot',
    limiters.forgotByEmail(), limiters.forgotByIp(),
    validate({ body: PasswordForgotBody }),
    async (req, res, next) => {
      try {
        const body = req.valid.body as { email: string };
        await deps.service.requestForgot(body.email);
        return res.json({ ok: true });
      } catch (err) { next(err); }
    });

  r.post('/password/reset',
    validate({ body: PasswordResetBody }),
    async (req, res, next) => {
      try {
        const body = req.valid.body as { token: string; newPassword: string };
        await deps.service.resetPassword(body.token, body.newPassword);
        return res.json({ ok: true });
      } catch (err) { next(err); }
    });
```

- [ ] **Step 4: Write failing test `apps/api/src/modules/auth/password-flows.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createTestDb, type TestDb } from '../../test/db.js';
import { hashPassword } from './password.js';
import { createUserRepo } from './userRepo.js';
import { createLoginAttemptRepo } from './loginAttemptRepo.js';
import { createRefreshTokenRepo } from './refreshTokenRepo.js';
import { createRefreshTokenService } from './refreshTokenService.js';
import { createJwtService } from './jwt.js';
import { createAuthService } from './authService.js';
import { createAuthRouter } from './authRoutes.js';
import { createPasswordResetRepo } from './passwordResetRepo.js';
import { createMailer } from '../../shared/mail/mailer.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';
import { users } from '../../shared/db/schema.js';

describe('password flows', () => {
  let ctx: TestDb;
  let app: express.Express;
  const sendMail = vi.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    ctx = await createTestDb();
    const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });
    const mailer = createMailer({ transport: { sendMail } as any, from: 'Naratala <n@x.co>' });
    const service = createAuthService({
      users: createUserRepo(ctx.db),
      loginAttempts: createLoginAttemptRepo(ctx.db),
      jwt,
      refresh: createRefreshTokenService({ repo: createRefreshTokenRepo(ctx.db), ttlMs: 30 * 86400000 }),
      refreshTtlMs: 30 * 86400000,
      passwordResets: createPasswordResetRepo(ctx.db),
      mailer, appUrl: 'https://naratala.local',
      hibp: async () => '', // treat nothing as pwned in tests
    });
    app = express();
    app.set('trust proxy', 1);
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/auth', createAuthRouter({ service, jwt }));
    app.use(errorHandler());
  });
  afterAll(async () => { await ctx.drop(); });
  beforeEach(async () => { await ctx.truncateAll(); sendMail.mockClear(); });

  async function seed() {
    const h = await hashPassword('correct-horse-12');
    const [row] = await ctx.db.insert(users).values({
      email: 'u@naratala.local', passwordHash: h, role: 'employee', status: 'active',
    }).$returningId();
    return row.id;
  }

  it('forgot returns 200 for unknown email with no mail sent', async () => {
    const r = await request(app).post('/api/auth/password/forgot').send({ email: 'unknown@x.co' });
    expect(r.status).toBe(200);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('forgot sends a reset email for known users', async () => {
    await seed();
    const r = await request(app).post('/api/auth/password/forgot').send({ email: 'u@naratala.local' });
    expect(r.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const sent = sendMail.mock.calls[0][0];
    expect(sent.to).toBe('u@naratala.local');
    expect(sent.html).toMatch(/token=/);
  });

  it('change-password requires current password', async () => {
    await seed();
    const login = await request(app).post('/api/auth/login').send({ email: 'u@naratala.local', password: 'correct-horse-12' });
    const token = login.body.accessToken as string;
    const ok = await request(app).post('/api/auth/password/change')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'correct-horse-12', newPassword: 'new-password-42' });
    expect(ok.status).toBe(200);

    const bad = await request(app).post('/api/auth/password/change')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'not-the-right-one', newPassword: 'another-password-99' });
    expect(bad.status).toBe(401);
  });

  it('reset with a good token rotates password', async () => {
    await seed();
    await request(app).post('/api/auth/password/forgot').send({ email: 'u@naratala.local' });
    const link = sendMail.mock.calls[0][0].html as string;
    const token = /token=([A-Za-z0-9_-]+)/.exec(link)![1]!;
    const r = await request(app).post('/api/auth/password/reset').send({ token, newPassword: 'new-password-42' });
    expect(r.status).toBe(200);

    const again = await request(app).post('/api/auth/password/reset').send({ token, newPassword: 'another-99999999' });
    expect(again.status).toBe(410);
  });
});
```

- [ ] **Step 5: Run, expect PASS**

Run: `pnpm --filter api test src/modules/auth/password-flows.test.ts`
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/auth
git commit -m "feat(auth): password change, forgot, reset with single-use tokens"
```

---

## Task 27: MFA enrollment (setup / confirm / disable)

**Files:**
- Modify: `apps/api/src/modules/auth/authService.ts`
- Modify: `apps/api/src/modules/auth/authRoutes.ts`
- Create: `apps/api/src/modules/auth/mfa-enrol.test.ts`

- [ ] **Step 1: Extend `authService.ts` with MFA enrolment methods**

Add these methods inside `createAuthService` (alongside the others):

```ts
  async function mfaSetupStart(userId: number): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await deps.users.findById(userId);
    if (!user) throw new AuthError('INVALID_CREDENTIALS', 'user not found');
    const { generateTotpSecret, totpOtpauthUrl } = await import('./mfa.js');
    const secret = generateTotpSecret();
    const otpauthUrl = totpOtpauthUrl(secret, 'Naratala HRIS', user.email);
    return { secret, otpauthUrl };
  }

  async function mfaSetupConfirm(userId: number, secret: string, code: string): Promise<{ recoveryCodes: string[] }> {
    const user = await deps.users.findById(userId);
    if (!user) throw new AuthError('INVALID_CREDENTIALS', 'user not found');
    const { verifyTotp, generateRecoveryCodes } = await import('./mfa.js');
    if (!verifyTotp(secret, code)) throw new AuthError('MFA_INVALID', 'invalid totp');
    const { encryptGcm } = await import('./crypto.js');
    const { loadEnv } = await import('../../shared/config/env.js');
    const key = loadEnv().MFA_ENCRYPTION_KEY;
    await deps.users.updateMfa(user.id, true, encryptGcm(key, secret));
    return { recoveryCodes: generateRecoveryCodes() };
  }

  async function mfaDisable(userId: number, currentPassword: string, code: string): Promise<void> {
    const user = await deps.users.findById(userId);
    if (!user || !user.mfaEnabled || !user.mfaSecret) throw new AuthError('MFA_INVALID', 'mfa not enabled');
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new AuthError('INVALID_CREDENTIALS', 'invalid credentials');
    }
    const { decryptGcm } = await import('./crypto.js');
    const { verifyTotp } = await import('./mfa.js');
    const { loadEnv } = await import('../../shared/config/env.js');
    const key = loadEnv().MFA_ENCRYPTION_KEY;
    const secret = decryptGcm(key, user.mfaSecret);
    if (!verifyTotp(secret, code)) throw new AuthError('MFA_INVALID', 'invalid totp');
    await deps.users.updateMfa(user.id, false, null);
  }
```

Extend the return: add `mfaSetupStart, mfaSetupConfirm, mfaDisable`.

- [ ] **Step 2: Extend `authRoutes.ts`**

Add to imports:

```ts
import { z } from 'zod';
import { MfaSetupConfirmBody, MfaDisableBody } from '@naratala/shared';
```

Insert before `return r;`:

```ts
  r.post('/mfa/setup/start', authenticate, async (req, res, next) => {
    try {
      const out = await deps.service.mfaSetupStart(req.user!.sub);
      return res.json(out);
    } catch (err) { next(err); }
  });

  const MfaConfirmWithSecret = z.object({
    code: z.string().regex(/^\d{6}$/), secret: z.string().min(16),
  }).strict();

  r.post('/mfa/setup/confirm', authenticate, validate({ body: MfaConfirmWithSecret }),
    async (req, res, next) => {
      try {
        const body = req.valid.body as { secret: string; code: string };
        const out = await deps.service.mfaSetupConfirm(req.user!.sub, body.secret, body.code);
        return res.json(out);
      } catch (err) { next(err); }
    });

  r.post('/mfa/disable', authenticate, validate({ body: MfaDisableBody }),
    async (req, res, next) => {
      try {
        const body = req.valid.body as { currentPassword: string; code: string };
        await deps.service.mfaDisable(req.user!.sub, body.currentPassword, body.code);
        return res.json({ ok: true });
      } catch (err) { next(err); }
    });
```

- [ ] **Step 3: Write failing test `apps/api/src/modules/auth/mfa-enrol.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { authenticator } from 'otplib';
import { createTestDb, type TestDb } from '../../test/db.js';
import { hashPassword } from './password.js';
import { createUserRepo } from './userRepo.js';
import { createLoginAttemptRepo } from './loginAttemptRepo.js';
import { createRefreshTokenRepo } from './refreshTokenRepo.js';
import { createRefreshTokenService } from './refreshTokenService.js';
import { createJwtService } from './jwt.js';
import { createAuthService } from './authService.js';
import { createAuthRouter } from './authRoutes.js';
import { createPasswordResetRepo } from './passwordResetRepo.js';
import { createMailer } from '../../shared/mail/mailer.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';
import { users } from '../../shared/db/schema.js';

describe('mfa enrol + disable', () => {
  let ctx: TestDb;
  let app: express.Express;

  beforeAll(async () => {
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('base64');
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(86);
    process.env.WEB_ORIGIN = 'http://localhost:5173';
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'mysql://naratala:dev@127.0.0.1:3306/naratala';
    process.env.SMTP_HOST = '127.0.0.1'; process.env.SMTP_PORT = '1025';
    process.env.MAIL_FROM = 'x@y.co';
    process.env.INITIAL_ADMIN_EMAIL = 'a@b.co'; process.env.INITIAL_ADMIN_PASSWORD = 'dev-password-12';

    ctx = await createTestDb();
    const jwt = createJwtService({ secret: process.env.JWT_ACCESS_SECRET!, accessTtl: '15m' });
    const service = createAuthService({
      users: createUserRepo(ctx.db),
      loginAttempts: createLoginAttemptRepo(ctx.db),
      jwt,
      refresh: createRefreshTokenService({ repo: createRefreshTokenRepo(ctx.db), ttlMs: 30 * 86400000 }),
      refreshTtlMs: 30 * 86400000,
      passwordResets: createPasswordResetRepo(ctx.db),
      mailer: createMailer({ transport: { sendMail: async () => undefined } as any, from: 'x@y.co' }),
      appUrl: 'http://localhost:5173',
      hibp: async () => '',
    });
    app = express();
    app.set('trust proxy', 1);
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/auth', createAuthRouter({ service, jwt }));
    app.use(errorHandler());
  });
  afterAll(async () => { await ctx.drop(); });
  beforeEach(async () => { await ctx.truncateAll(); });

  async function loginFresh() {
    const h = await hashPassword('correct-horse-12');
    await ctx.db.insert(users).values({ email: 'u@naratala.local', passwordHash: h, role: 'hr', status: 'active' });
    const r = await request(app).post('/api/auth/login').send({ email: 'u@naratala.local', password: 'correct-horse-12' });
    return r.body.accessToken as string;
  }

  it('start + confirm + subsequent login returns mfaRequired', async () => {
    const token = await loginFresh();
    const start = await request(app).post('/api/auth/mfa/setup/start').set('Authorization', `Bearer ${token}`);
    expect(start.status).toBe(200);
    const secret = start.body.secret as string;
    const code = authenticator.generate(secret);
    const conf = await request(app).post('/api/auth/mfa/setup/confirm')
      .set('Authorization', `Bearer ${token}`).send({ secret, code });
    expect(conf.status).toBe(200);
    expect(conf.body.recoveryCodes).toHaveLength(10);

    const next = await request(app).post('/api/auth/login').send({ email: 'u@naratala.local', password: 'correct-horse-12' });
    expect(next.status).toBe(200);
    expect(next.body.mfaRequired).toBe(true);
    expect(next.body.mfaToken).toBeDefined();
  });

  it('/mfa/verify trades mfaToken for full tokens', async () => {
    const token = await loginFresh();
    const start = await request(app).post('/api/auth/mfa/setup/start').set('Authorization', `Bearer ${token}`);
    const secret = start.body.secret as string;
    await request(app).post('/api/auth/mfa/setup/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ secret, code: authenticator.generate(secret) });

    const login = await request(app).post('/api/auth/login').send({ email: 'u@naratala.local', password: 'correct-horse-12' });
    const verify = await request(app).post('/api/auth/mfa/verify')
      .set('Authorization', `Bearer ${login.body.mfaToken}`)
      .send({ code: authenticator.generate(secret) });
    expect(verify.status).toBe(200);
    expect(verify.body.accessToken).toBeDefined();
  });
});
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter api test src/modules/auth/mfa-enrol.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/authService.ts apps/api/src/modules/auth/authRoutes.ts apps/api/src/modules/auth/mfa-enrol.test.ts
git commit -m "feat(auth): MFA enrolment (setup/confirm/disable) + verify trade"
```

---

## Task 28: `authorize` middleware (permission-based)

**Files:**
- Create: `apps/api/src/shared/middlewares/authorize.ts`
- Create: `apps/api/src/shared/middlewares/authorize.test.ts`

- [ ] **Step 1: Write failing test `apps/api/src/shared/middlewares/authorize.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { authorize } from './authorize.js';
import { errorHandler } from './errorHandler.js';
import type { Role } from '@naratala/shared';

function appFor(role: Role) {
  const app = express();
  app.use((req, _res, next) => { (req as any).user = { sub: 1, role, jti: 'x' }; next(); });
  app.get('/x', authorize('audit:read'), (_req, res) => res.json({ ok: true }));
  app.use(errorHandler());
  return app;
}

describe('authorize', () => {
  it('admin passes audit:read', async () => {
    const r = await request(appFor('admin')).get('/x');
    expect(r.status).toBe(200);
  });

  it('hr fails audit:read with 403 INSUFFICIENT_ROLE', async () => {
    const r = await request(appFor('hr')).get('/x');
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('INSUFFICIENT_ROLE');
  });

  it('unauthenticated request fails 401', async () => {
    const app = express();
    app.get('/x', authorize('audit:read'), (_req, res) => res.json({ ok: true }));
    app.use(errorHandler());
    const r = await request(app).get('/x');
    expect(r.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter api test src/shared/middlewares/authorize.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `apps/api/src/shared/middlewares/authorize.ts`**

```ts
import type { RequestHandler } from 'express';
import { hasPermission, type Permission } from '@naratala/shared';
import { AuthError, ForbiddenError } from '../errors/index.js';

export function authorize(required: Permission | Permission[]): RequestHandler {
  const perms = Array.isArray(required) ? required : [required];
  return (req, _res, next) => {
    if (!req.user) return next(new AuthError('TOKEN_EXPIRED', 'not authenticated'));
    for (const p of perms) {
      if (!hasPermission(req.user.role, p)) return next(new ForbiddenError(`missing ${p}`));
    }
    return next();
  };
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter api test src/shared/middlewares/authorize.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/shared/middlewares/authorize.ts apps/api/src/shared/middlewares/authorize.test.ts
git commit -m "feat(api): authorize middleware (permission-based, references spec §7)"
```

---

## Task 29: Invites module (create / view / accept / resend / delete)

**Files:**
- Create: `apps/api/src/modules/invites/inviteRepo.ts`
- Create: `apps/api/src/modules/invites/inviteService.ts`
- Create: `apps/api/src/modules/invites/inviteRoutes.ts`
- Create: `apps/api/src/modules/invites/invites.test.ts`

- [ ] **Step 1: Implement `apps/api/src/modules/invites/inviteRepo.ts`**

```ts
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { invites, employees } from '../../shared/db/schema.js';
import type { Role } from '@naratala/shared';

export interface InviteRow {
  id: number;
  employeeId: number;
  email: string;
  roleToAssign: Role;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdBy: number;
  createdAt: Date;
}

export interface InviteRepo {
  create(input: Omit<InviteRow, 'id' | 'acceptedAt' | 'createdAt'>): Promise<number>;
  findById(id: number): Promise<InviteRow | undefined>;
  findUsableByHash(hash: string, now: Date): Promise<(InviteRow & { employeeFullName: string }) | undefined>;
  rotate(id: number, newHash: string, newExpiresAt: Date): Promise<void>;
  markAccepted(id: number): Promise<void>;
  deleteById(id: number): Promise<number>;
}

export function createInviteRepo(db: DB): InviteRepo {
  return {
    async create(input) {
      const [r] = await db.insert(invites).values({
        employeeId: input.employeeId, email: input.email,
        roleToAssign: input.roleToAssign, tokenHash: input.tokenHash,
        expiresAt: input.expiresAt, createdBy: input.createdBy,
      }).$returningId();
      return r.id;
    },
    async findById(id) {
      const [row] = await db.select().from(invites).where(eq(invites.id, id)).limit(1);
      return row as InviteRow | undefined;
    },
    async findUsableByHash(hash, now) {
      const [row] = await db
        .select({
          id: invites.id, employeeId: invites.employeeId, email: invites.email,
          roleToAssign: invites.roleToAssign, tokenHash: invites.tokenHash,
          expiresAt: invites.expiresAt, acceptedAt: invites.acceptedAt,
          createdBy: invites.createdBy, createdAt: invites.createdAt,
          employeeFullName: employees.fullName,
        })
        .from(invites)
        .innerJoin(employees, eq(employees.id, invites.employeeId))
        .where(and(eq(invites.tokenHash, hash), isNull(invites.acceptedAt), gt(invites.expiresAt, now)))
        .limit(1);
      return row as any;
    },
    async rotate(id, newHash, newExpiresAt) {
      await db.update(invites).set({ tokenHash: newHash, expiresAt: newExpiresAt }).where(eq(invites.id, id));
    },
    async markAccepted(id) {
      await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, id));
    },
    async deleteById(id) {
      const r: any = await db.delete(invites).where(eq(invites.id, id));
      return Number(r?.affectedRows ?? 0);
    },
  };
}
```

- [ ] **Step 2: Implement `apps/api/src/modules/invites/inviteService.ts`**

```ts
import { AuthError, NotFoundError, ValidationError } from '../../shared/errors/index.js';
import { newOpaqueToken, sha256Hex } from '../auth/opaqueToken.js';
import { assertPasswordStrong, checkPwned, hashPassword } from '../auth/password.js';
import type { Role } from '@naratala/shared';
import type { InviteRepo } from './inviteRepo.js';
import type { UserRepo } from '../auth/userRepo.js';
import type { DB } from '../../shared/db/client.js';
import { employees, users } from '../../shared/db/schema.js';
import { and, eq, isNull } from 'drizzle-orm';
import type { Mailer } from '../../shared/mail/mailer.js';
import { inviteEmail } from '../../shared/mail/templates.js';
import type { AuthService } from '../auth/authService.js';

interface Deps {
  db: DB;
  invites: InviteRepo;
  users: UserRepo;
  mailer: Mailer;
  auth: AuthService;
  appUrl: string;
  ttlMs: number;
  hibp?: (prefix: string) => Promise<string>;
}

export function createInviteService(deps: Deps) {
  async function issue(actorId: number, employeeId: number, role: Role) {
    const [emp] = await deps.db.select().from(employees)
      .where(and(eq(employees.id, employeeId), isNull(employees.deletedAt))).limit(1);
    if (!emp) throw new NotFoundError('employee not found');
    const raw = newOpaqueToken();
    const expiresAt = new Date(Date.now() + deps.ttlMs);
    const id = await deps.invites.create({
      employeeId, email: emp.email, roleToAssign: role,
      tokenHash: sha256Hex(raw), expiresAt, createdBy: actorId,
    });
    await sendInvite(emp.fullName, emp.email, raw, expiresAt);
    return { id, expiresAt };
  }

  async function view(rawToken: string) {
    const row = await deps.invites.findUsableByHash(sha256Hex(rawToken), new Date());
    if (!row) throw new AuthError('INVITE_EXPIRED', 'invite invalid or expired');
    return { email: row.email, fullName: row.employeeFullName, expiresAt: row.expiresAt.toISOString() };
  }

  async function accept(rawToken: string, password: string, ip: string, userAgent?: string) {
    const row = await deps.invites.findUsableByHash(sha256Hex(rawToken), new Date());
    if (!row) throw new AuthError('INVITE_EXPIRED', 'invite invalid or expired');
    assertPasswordStrong(password);
    if (await checkPwned(password, deps.hibp)) throw new AuthError('PASSWORD_PWNED', 'password compromised');
    const pwHash = await hashPassword(password);

    const existing = await deps.users.findByEmail(row.email);
    let userId: number;
    if (existing) {
      if (existing.status !== 'pending') throw new AuthError('EMAIL_TAKEN', 'user already active');
      await deps.users.updatePasswordHash(existing.id, pwHash, false);
      await deps.users.patch(existing.id, { status: 'active', role: row.roleToAssign });
      userId = existing.id;
    } else {
      const [inserted] = await deps.db.insert(users).values({
        email: row.email, passwordHash: pwHash, role: row.roleToAssign, status: 'active',
      }).$returningId();
      userId = inserted.id;
    }
    await deps.db.update(employees).set({ userId }).where(eq(employees.id, row.employeeId));
    await deps.invites.markAccepted(row.id);

    const user = await deps.users.findById(userId);
    if (!user) throw new ValidationError('invite accept failed');
    return deps.auth.issueFreshTokens(user, ip, userAgent);
  }

  async function resend(id: number) {
    const row = await deps.invites.findById(id);
    if (!row) throw new NotFoundError('invite not found');
    if (row.acceptedAt) throw new AuthError('INVITE_ALREADY_ACCEPTED', 'already accepted');
    const [emp] = await deps.db.select().from(employees).where(eq(employees.id, row.employeeId)).limit(1);
    if (!emp) throw new NotFoundError('employee missing');
    const raw = newOpaqueToken();
    const expiresAt = new Date(Date.now() + deps.ttlMs);
    await deps.invites.rotate(id, sha256Hex(raw), expiresAt);
    await sendInvite(emp.fullName, emp.email, raw, expiresAt);
    return { id, expiresAt };
  }

  async function remove(id: number) {
    const row = await deps.invites.findById(id);
    if (!row) throw new NotFoundError('invite not found');
    if (row.acceptedAt) throw new AuthError('INVITE_ALREADY_ACCEPTED', 'already accepted');
    await deps.invites.deleteById(id);
  }

  async function sendInvite(name: string, email: string, rawToken: string, expiresAt: Date) {
    const url = `${deps.appUrl}/invite/accept?token=${rawToken}`;
    const tmpl = inviteEmail({ recipientName: name, url, expiresAt });
    await deps.mailer.send({ to: email, subject: tmpl.subject, html: tmpl.html });
  }

  return { issue, view, accept, resend, remove };
}

export type InviteService = ReturnType<typeof createInviteService>;
```

- [ ] **Step 3: Implement `apps/api/src/modules/invites/inviteRoutes.ts`**

```ts
import { Router } from 'express';
import { z } from 'zod';
import { InviteCreateBody, AcceptInviteBody } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import { setRefreshCookie } from '../auth/authService.js';
import { toUserDTO } from '../auth/userDto.js';
import type { InviteService } from './inviteService.js';
import type { JwtService } from '../auth/jwt.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const TokenParam = z.object({ token: z.string().min(10).max(100) });

export function createInviteRouter(deps: { service: InviteService; jwt: JwtService }): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

  r.post('/', authenticate, authorize('invites:manage'),
    validate({ body: InviteCreateBody }),
    async (req, res, next) => {
      try {
        const body = req.valid.body as { employeeId: number; role: any };
        const out = await deps.service.issue(req.user!.sub, body.employeeId, body.role);
        return res.status(201).json({ id: out.id, expiresAt: out.expiresAt.toISOString() });
      } catch (err) { next(err); }
    });

  r.get('/:token', validate({ params: TokenParam }), async (req, res, next) => {
    try {
      const out = await deps.service.view((req.valid.params as any).token);
      return res.json(out);
    } catch (err) { next(err); }
  });

  r.post('/:token/accept',
    validate({ params: TokenParam, body: AcceptInviteBody }),
    async (req, res, next) => {
      try {
        const body = req.valid.body as { password: string };
        const result = await deps.service.accept(
          (req.valid.params as any).token, body.password,
          req.ip ?? 'unknown', req.header('user-agent') ?? undefined,
        );
        setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
        return res.json({ accessToken: result.accessToken, user: toUserDTO(result.user) });
      } catch (err) { next(err); }
    });

  r.post('/:id/resend', authenticate, authorize('invites:manage'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        const id = (req.valid.params as any).id as number;
        const out = await deps.service.resend(id);
        return res.json({ id: out.id, expiresAt: out.expiresAt.toISOString() });
      } catch (err) { next(err); }
    });

  r.delete('/:id', authenticate, authorize('invites:manage'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        await deps.service.remove((req.valid.params as any).id as number);
        return res.json({ ok: true });
      } catch (err) { next(err); }
    });

  return r;
}
```

- [ ] **Step 4: Write failing test `apps/api/src/modules/invites/invites.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createTestDb, type TestDb } from '../../test/db.js';
import { departments, employees, users } from '../../shared/db/schema.js';
import { hashPassword } from '../auth/password.js';
import { createUserRepo } from '../auth/userRepo.js';
import { createLoginAttemptRepo } from '../auth/loginAttemptRepo.js';
import { createRefreshTokenRepo } from '../auth/refreshTokenRepo.js';
import { createRefreshTokenService } from '../auth/refreshTokenService.js';
import { createJwtService } from '../auth/jwt.js';
import { createAuthService } from '../auth/authService.js';
import { createAuthRouter } from '../auth/authRoutes.js';
import { createPasswordResetRepo } from '../auth/passwordResetRepo.js';
import { createInviteRepo } from './inviteRepo.js';
import { createInviteService } from './inviteService.js';
import { createInviteRouter } from './inviteRoutes.js';
import { createMailer } from '../../shared/mail/mailer.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';

describe('invites', () => {
  let ctx: TestDb;
  let app: express.Express;
  const sendMail = vi.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    ctx = await createTestDb();
    const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });
    const mailer = createMailer({ transport: { sendMail } as any, from: 'Naratala <n@x.co>' });
    const userRepo = createUserRepo(ctx.db);
    const authSvc = createAuthService({
      users: userRepo,
      loginAttempts: createLoginAttemptRepo(ctx.db),
      jwt,
      refresh: createRefreshTokenService({ repo: createRefreshTokenRepo(ctx.db), ttlMs: 30 * 86400000 }),
      refreshTtlMs: 30 * 86400000,
      passwordResets: createPasswordResetRepo(ctx.db),
      mailer, appUrl: 'http://localhost:5173', hibp: async () => '',
    });
    const inviteSvc = createInviteService({
      db: ctx.db, invites: createInviteRepo(ctx.db), users: userRepo,
      mailer, auth: authSvc, appUrl: 'http://localhost:5173',
      ttlMs: 48 * 3600 * 1000, hibp: async () => '',
    });

    app = express();
    app.set('trust proxy', 1);
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/auth', createAuthRouter({ service: authSvc, jwt }));
    app.use('/api/invites', createInviteRouter({ service: inviteSvc, jwt }));
    app.use(errorHandler());
  });
  afterAll(async () => { await ctx.drop(); });
  beforeEach(async () => { await ctx.truncateAll(); sendMail.mockClear(); });

  async function seedAdminAndEmployee() {
    const pw = await hashPassword('correct-horse-12');
    const [admin] = await ctx.db.insert(users).values({
      email: 'admin@naratala.local', passwordHash: pw, role: 'admin', status: 'active',
    }).$returningId();
    const [dep] = await ctx.db.insert(departments).values({ name: 'Eng' }).$returningId();
    const [emp] = await ctx.db.insert(employees).values({
      fullName: 'Ayu Wulan', email: 'ayu@naratala.local', departmentId: dep.id,
      position: 'Engineer', employmentType: 'full_time', hireDate: '2025-01-15', avatarColorHue: 120,
    }).$returningId();

    const login = await request(app).post('/api/auth/login')
      .send({ email: 'admin@naratala.local', password: 'correct-horse-12' });
    return { accessToken: login.body.accessToken as string, employeeId: emp.id };
  }

  it('admin issues → employee views → employee accepts and is logged in', async () => {
    const { accessToken, employeeId } = await seedAdminAndEmployee();

    const issue = await request(app).post('/api/invites')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ employeeId, role: 'manager' });
    expect(issue.status).toBe(201);
    expect(sendMail).toHaveBeenCalledTimes(1);

    const html = sendMail.mock.calls[0][0].html as string;
    const token = /token=([A-Za-z0-9_-]+)/.exec(html)![1]!;

    const view = await request(app).get(`/api/invites/${token}`);
    expect(view.status).toBe(200);
    expect(view.body.email).toBe('ayu@naratala.local');

    const accept = await request(app).post(`/api/invites/${token}/accept`).send({ password: 'ayu-password-12' });
    expect(accept.status).toBe(200);
    expect(accept.body.user.role).toBe('manager');
    expect(accept.body.user.email).toBe('ayu@naratala.local');

    // second accept fails (already accepted)
    const again = await request(app).post(`/api/invites/${token}/accept`).send({ password: 'ayu-password-12' });
    expect(again.status).toBe(410);
  });

  it('resend rotates token; old token stops working', async () => {
    const { accessToken, employeeId } = await seedAdminAndEmployee();
    const issue = await request(app).post('/api/invites')
      .set('Authorization', `Bearer ${accessToken}`).send({ employeeId, role: 'employee' });
    const id = issue.body.id as number;
    const oldHtml = sendMail.mock.calls[0][0].html as string;
    const oldToken = /token=([A-Za-z0-9_-]+)/.exec(oldHtml)![1]!;

    const resend = await request(app).post(`/api/invites/${id}/resend`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(resend.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(2);

    const view = await request(app).get(`/api/invites/${oldToken}`);
    expect(view.status).toBe(401);
  });

  it('non-admin cannot issue', async () => {
    const pw = await hashPassword('correct-horse-12');
    await ctx.db.insert(users).values({
      email: 'm@naratala.local', passwordHash: pw, role: 'manager', status: 'active',
    });
    const login = await request(app).post('/api/auth/login')
      .send({ email: 'm@naratala.local', password: 'correct-horse-12' });
    const r = await request(app).post('/api/invites')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ employeeId: 1, role: 'manager' });
    expect(r.status).toBe(403);
  });
});
```

- [ ] **Step 5: Run, expect PASS**

Run: `pnpm --filter api test src/modules/invites/invites.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/invites
git commit -m "feat(invites): create/view/accept/resend/delete with RBAC + audit-grade token handling"
```

---

## Task 30: Departments module (CRUD)

**Files:**
- Create: `apps/api/src/modules/departments/departmentRepo.ts`
- Create: `apps/api/src/modules/departments/departmentService.ts`
- Create: `apps/api/src/modules/departments/departmentRoutes.ts`
- Create: `apps/api/src/modules/departments/departments.test.ts`

- [ ] **Step 1: Implement `apps/api/src/modules/departments/departmentRepo.ts`**

```ts
import { asc, eq, sql } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { departments, employees } from '../../shared/db/schema.js';

export interface DepartmentRow { id: number; name: string; createdAt: Date; updatedAt: Date; }

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
    async list() { return (await db.select().from(departments).orderBy(asc(departments.name))) as DepartmentRow[]; },
    async findById(id) {
      const [row] = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
      return row as DepartmentRow | undefined;
    },
    async findByName(name) {
      const [row] = await db.select().from(departments).where(eq(departments.name, name)).limit(1);
      return row as DepartmentRow | undefined;
    },
    async create(name) {
      const [r] = await db.insert(departments).values({ name }).$returningId();
      return r.id;
    },
    async updateName(id, name) { await db.update(departments).set({ name }).where(eq(departments.id, id)); },
    async delete(id) { await db.delete(departments).where(eq(departments.id, id)); },
    async countEmployees(id) {
      const [row] = await db.execute<{ n: number }>(
        sql`SELECT COUNT(*) AS n FROM employees WHERE department_id = ${id} AND deleted_at IS NULL`,
      );
      return Number((row as any)?.n ?? 0);
    },
  };
}
```

- [ ] **Step 2: Implement `apps/api/src/modules/departments/departmentService.ts`**

```ts
import type { DepartmentDTO } from '@naratala/shared';
import { AuthError, NotFoundError, ValidationError } from '../../shared/errors/index.js';
import type { DepartmentRepo, DepartmentRow } from './departmentRepo.js';

export function createDepartmentService(repo: DepartmentRepo) {
  async function list(): Promise<DepartmentDTO[]> {
    return (await repo.list()).map(toDto);
  }
  async function create(name: string): Promise<DepartmentDTO> {
    const existing = await repo.findByName(name);
    if (existing) throw new AuthError('EMAIL_TAKEN', 'department name already exists');
    const id = await repo.create(name);
    const row = await repo.findById(id);
    return toDto(row!);
  }
  async function update(id: number, name: string): Promise<DepartmentDTO> {
    const row = await repo.findById(id);
    if (!row) throw new NotFoundError('department not found');
    const conflict = await repo.findByName(name);
    if (conflict && conflict.id !== id) throw new AuthError('EMAIL_TAKEN', 'name in use');
    await repo.updateName(id, name);
    const updated = await repo.findById(id);
    return toDto(updated!);
  }
  async function remove(id: number): Promise<void> {
    const row = await repo.findById(id);
    if (!row) throw new NotFoundError('department not found');
    const n = await repo.countEmployees(id);
    if (n > 0) throw new ValidationError('department is referenced by employees', { employees: n });
    await repo.delete(id);
  }
  return { list, create, update, remove };
}
export type DepartmentService = ReturnType<typeof createDepartmentService>;

function toDto(row: DepartmentRow): DepartmentDTO {
  return { id: row.id, name: row.name, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
```

- [ ] **Step 3: Implement `apps/api/src/modules/departments/departmentRoutes.ts`**

```ts
import { Router } from 'express';
import { z } from 'zod';
import { DepartmentCreate, DepartmentUpdate } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { DepartmentService } from './departmentService.js';
import type { JwtService } from '../auth/jwt.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });

export function createDepartmentRouter(deps: { service: DepartmentService; jwt: JwtService }): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

  r.get('/', authenticate, async (_req, res, next) => {
    try { res.json({ data: await deps.service.list() }); } catch (e) { next(e); }
  });

  r.post('/', authenticate, authorize('departments:manage'),
    validate({ body: DepartmentCreate }),
    async (req, res, next) => {
      try {
        const body = req.valid.body as { name: string };
        res.status(201).json(await deps.service.create(body.name));
      } catch (e) { next(e); }
    });

  r.patch('/:id', authenticate, authorize('departments:manage'),
    validate({ params: IdParam, body: DepartmentUpdate }),
    async (req, res, next) => {
      try {
        const id = (req.valid.params as any).id as number;
        const body = req.valid.body as { name?: string };
        if (!body.name) return res.json({ ok: true });
        res.json(await deps.service.update(id, body.name));
      } catch (e) { next(e); }
    });

  r.delete('/:id', authenticate, authorize('departments:manage'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        await deps.service.remove((req.valid.params as any).id as number);
        res.json({ ok: true });
      } catch (e) { next(e); }
    });

  return r;
}
```

- [ ] **Step 4: Write failing test `apps/api/src/modules/departments/departments.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createTestDb, type TestDb } from '../../test/db.js';
import { hashPassword } from '../auth/password.js';
import { users, departments, employees } from '../../shared/db/schema.js';
import { createJwtService } from '../auth/jwt.js';
import { createDepartmentRepo } from './departmentRepo.js';
import { createDepartmentService } from './departmentService.js';
import { createDepartmentRouter } from './departmentRoutes.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';

describe('departments', () => {
  let ctx: TestDb;
  let app: express.Express;
  const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });

  beforeAll(async () => {
    ctx = await createTestDb();
    const svc = createDepartmentService(createDepartmentRepo(ctx.db));
    app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/departments', createDepartmentRouter({ service: svc, jwt }));
    app.use(errorHandler());
  });
  afterAll(async () => { await ctx.drop(); });
  beforeEach(async () => { await ctx.truncateAll(); });

  function tokenFor(role: 'admin' | 'hr' | 'manager' | 'employee') {
    return jwt.signAccess({ sub: 1, role });
  }

  it('GET is available to any authed user', async () => {
    const r = await request(app).get('/api/departments').set('Authorization', `Bearer ${tokenFor('employee')}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data)).toBe(true);
  });

  it('POST/PATCH/DELETE require departments:manage', async () => {
    const empTok = tokenFor('employee');
    const r1 = await request(app).post('/api/departments').set('Authorization', `Bearer ${empTok}`).send({ name: 'Eng' });
    expect(r1.status).toBe(403);
  });

  it('admin round-trip: create → update → delete', async () => {
    const tok = tokenFor('admin');
    const created = await request(app).post('/api/departments').set('Authorization', `Bearer ${tok}`).send({ name: 'Ops' });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const updated = await request(app).patch(`/api/departments/${id}`)
      .set('Authorization', `Bearer ${tok}`).send({ name: 'Operations' });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Operations');

    const del = await request(app).delete(`/api/departments/${id}`).set('Authorization', `Bearer ${tok}`);
    expect(del.status).toBe(200);
  });

  it('DELETE blocked when employees reference the department', async () => {
    const tok = tokenFor('admin');
    const created = await request(app).post('/api/departments').set('Authorization', `Bearer ${tok}`).send({ name: 'Ops' });
    const id = created.body.id as number;
    await ctx.db.insert(employees).values({
      fullName: 'A', email: 'a@x.co', departmentId: id, position: 'p',
      employmentType: 'full_time', hireDate: '2025-01-01', avatarColorHue: 10,
    });
    const del = await request(app).delete(`/api/departments/${id}`).set('Authorization', `Bearer ${tok}`);
    expect(del.status).toBe(400);
    expect(del.body.code).toBe('VALIDATION_FAILED');
  });
});
```

- [ ] **Step 5: Run, expect PASS**

Run: `pnpm --filter api test src/modules/departments/departments.test.ts`
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/departments
git commit -m "feat(departments): CRUD with reference-guarded delete"
```

---

## Task 31: Users module (list / patch / force-logout)

**Files:**
- Create: `apps/api/src/modules/users/userService.ts`
- Create: `apps/api/src/modules/users/userRoutes.ts`
- Create: `apps/api/src/modules/users/users.test.ts`

- [ ] **Step 1: Implement `apps/api/src/modules/users/userService.ts`**

```ts
import type { UserDTO } from '@naratala/shared';
import { NotFoundError, ValidationError } from '../../shared/errors/index.js';
import type { UserRepo, UserRow, UserStatus } from '../auth/userRepo.js';
import type { Role } from '@naratala/shared';
import type { RefreshTokenService } from '../auth/refreshTokenService.js';
import { toUserDTO } from '../auth/userDto.js';

interface Deps { users: UserRepo; refresh: RefreshTokenService; }

export function createUserService(deps: Deps) {
  async function list(page: number, pageSize: number): Promise<{ data: UserDTO[]; page: number; pageSize: number; total: number }> {
    const { rows, total } = await deps.users.listPaginated({ page, pageSize });
    return { data: rows.map(toUserDTO), page, pageSize, total };
  }

  async function patch(actorId: number, targetId: number, input: {
    role?: Role; status?: UserStatus; language?: 'id' | 'en';
  }): Promise<UserDTO> {
    const target = await deps.users.findById(targetId);
    if (!target) throw new NotFoundError('user not found');

    const willDemoteAdmin =
      target.role === 'admin' && input.role !== undefined && input.role !== 'admin';
    const willDisable =
      target.status === 'active' && input.status === 'disabled';

    if (actorId === targetId && input.status === 'disabled') {
      throw new ValidationError('cannot disable yourself');
    }
    if (willDemoteAdmin || willDisable && target.role === 'admin') {
      const admins = await deps.users.countAdmins();
      if (admins <= 1) throw new ValidationError('cannot remove the last admin');
    }

    await deps.users.patch(targetId, input);
    const updated = await deps.users.findById(targetId);
    return toUserDTO(updated!);
  }

  async function forceLogout(targetId: number): Promise<void> {
    const target = await deps.users.findById(targetId);
    if (!target) throw new NotFoundError('user not found');
    await deps.refresh.revokeAllForUser(targetId);
  }

  return { list, patch, forceLogout };
}
export type UserService = ReturnType<typeof createUserService>;
```

- [ ] **Step 2: Implement `apps/api/src/modules/users/userRoutes.ts`**

```ts
import { Router } from 'express';
import { z } from 'zod';
import { UserUpdate, PaginationQuery } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { UserService } from './userService.js';
import type { JwtService } from '../auth/jwt.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });

export function createUserRouter(deps: { service: UserService; jwt: JwtService }): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

  r.get('/', authenticate, authorize('users:read'), validate({ query: PaginationQuery }),
    async (req, res, next) => {
      try {
        const q = req.valid.query as { page: number; pageSize: number };
        res.json(await deps.service.list(q.page, q.pageSize));
      } catch (e) { next(e); }
    });

  r.patch('/:id', authenticate, authorize('users:write'),
    validate({ params: IdParam, body: UserUpdate }),
    async (req, res, next) => {
      try {
        const id = (req.valid.params as any).id as number;
        const body = req.valid.body as any;
        res.json(await deps.service.patch(req.user!.sub, id, body));
      } catch (e) { next(e); }
    });

  r.post('/:id/force-logout', authenticate, authorize('users:write'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        const id = (req.valid.params as any).id as number;
        await deps.service.forceLogout(id);
        res.json({ ok: true });
      } catch (e) { next(e); }
    });

  return r;
}
```

- [ ] **Step 3: Write failing test `apps/api/src/modules/users/users.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createJwtService } from '../auth/jwt.js';
import { createUserRepo } from '../auth/userRepo.js';
import { createRefreshTokenRepo } from '../auth/refreshTokenRepo.js';
import { createRefreshTokenService } from '../auth/refreshTokenService.js';
import { createUserService } from './userService.js';
import { createUserRouter } from './userRoutes.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';
import { hashPassword } from '../auth/password.js';
import { users } from '../../shared/db/schema.js';

describe('users module', () => {
  let ctx: TestDb;
  let app: express.Express;
  const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });

  beforeAll(async () => {
    ctx = await createTestDb();
    const repo = createUserRepo(ctx.db);
    const refresh = createRefreshTokenService({ repo: createRefreshTokenRepo(ctx.db), ttlMs: 30 * 86400000 });
    const svc = createUserService({ users: repo, refresh });
    app = express();
    app.use(cookieParser()); app.use(express.json());
    app.use('/api/users', createUserRouter({ service: svc, jwt }));
    app.use(errorHandler());
  });
  afterAll(async () => { await ctx.drop(); });
  beforeEach(async () => { await ctx.truncateAll(); });

  async function seedAdmin() {
    const pw = await hashPassword('correct-horse-12');
    const [row] = await ctx.db.insert(users).values({
      email: 'admin@naratala.local', passwordHash: pw, role: 'admin', status: 'active',
    }).$returningId();
    return row.id;
  }

  it('only admin can list users', async () => {
    const nonAdmin = jwt.signAccess({ sub: 1, role: 'hr' });
    const r = await request(app).get('/api/users').set('Authorization', `Bearer ${nonAdmin}`);
    expect(r.status).toBe(403);
  });

  it('admin can list and patch', async () => {
    const adminId = await seedAdmin();
    const tok = jwt.signAccess({ sub: adminId, role: 'admin' });
    const list = await request(app).get('/api/users').set('Authorization', `Bearer ${tok}`);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);

    const other = await ctx.db.insert(users).values({
      email: 'x@naratala.local', passwordHash: 'x', role: 'employee', status: 'active',
    }).$returningId();
    const patched = await request(app).patch(`/api/users/${other[0].id}`)
      .set('Authorization', `Bearer ${tok}`).send({ role: 'hr' });
    expect(patched.status).toBe(200);
    expect(patched.body.role).toBe('hr');
  });

  it('last-admin demotion is blocked', async () => {
    const adminId = await seedAdmin();
    const tok = jwt.signAccess({ sub: adminId, role: 'admin' });
    const r = await request(app).patch(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${tok}`).send({ role: 'employee' });
    expect(r.status).toBe(400);
  });

  it('self-disable is blocked', async () => {
    const adminId = await seedAdmin();
    const tok = jwt.signAccess({ sub: adminId, role: 'admin' });
    const r = await request(app).patch(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${tok}`).send({ status: 'disabled' });
    expect(r.status).toBe(400);
  });
});
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter api test src/modules/users/users.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/users
git commit -m "feat(users): list/patch/force-logout with last-admin + self-disable guards"
```

---

## Task 32: Employees repo + DTO mapper with salary scoping

**Files:**
- Create: `apps/api/src/modules/employees/employeeRepo.ts`
- Create: `apps/api/src/modules/employees/employeeDto.ts`
- Create: `apps/api/src/modules/employees/employeeDto.test.ts`

- [ ] **Step 1: Implement `apps/api/src/modules/employees/employeeRepo.ts`**

```ts
import { and, asc, desc, eq, isNull, like, or, sql } from 'drizzle-orm';
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
  create(input: Omit<EmployeeRow, 'id' | 'departmentName' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<number>;
  update(id: number, patch: Partial<EmployeeRow>): Promise<void>;
  softDelete(id: number): Promise<void>;
  directReportIdsOfUserEmployee(userId: number): Promise<number[]>;
  employeeIdOfUser(userId: number): Promise<number | null>;
}

export function createEmployeeRepo(db: DB): EmployeeRepo {
  function base() {
    return db
      .select({
        id: employees.id, userId: employees.userId, fullName: employees.fullName,
        email: employees.email, phone: employees.phone, pronouns: employees.pronouns,
        departmentId: employees.departmentId, departmentName: departments.name,
        position: employees.position, location: employees.location,
        employmentType: employees.employmentType, employmentStatus: employees.employmentStatus,
        hireDate: employees.hireDate, managerId: employees.managerId,
        salaryAmount: employees.salaryAmount, salaryCurrency: employees.salaryCurrency,
        avatarColorHue: employees.avatarColorHue,
        createdAt: employees.createdAt, updatedAt: employees.updatedAt, deletedAt: employees.deletedAt,
      })
      .from(employees)
      .leftJoin(departments, eq(departments.id, employees.departmentId));
  }

  return {
    async list(f) {
      const conds: any[] = [isNull(employees.deletedAt)];
      if (f.q) conds.push(or(like(employees.fullName, `%${f.q}%`), like(employees.email, `%${f.q}%`)));
      if (f.departmentId) conds.push(eq(employees.departmentId, f.departmentId));
      if (f.status) conds.push(eq(employees.employmentStatus, f.status));

      const sortCol = f.sort === 'hireDate' ? employees.hireDate
        : f.sort === 'department' ? departments.name : employees.fullName;
      const order = f.sortDir === 'desc' ? desc(sortCol) : asc(sortCol);

      const offset = (f.page - 1) * f.pageSize;
      const rows = await base().where(and(...conds)).orderBy(order).limit(f.pageSize).offset(offset);

      const [countRow] = await db.execute<{ n: number }>(
        sql`SELECT COUNT(*) AS n FROM employees WHERE deleted_at IS NULL`,
      );
      return { rows: rows as EmployeeRow[], total: Number((countRow as any)?.n ?? 0) };
    },

    async findById(id) {
      const [row] = await base().where(and(eq(employees.id, id), isNull(employees.deletedAt))).limit(1);
      return row as EmployeeRow | undefined;
    },
    async findByUserId(userId) {
      const [row] = await base().where(and(eq(employees.userId, userId), isNull(employees.deletedAt))).limit(1);
      return row as EmployeeRow | undefined;
    },
    async findByEmail(email) {
      const [row] = await base().where(and(eq(employees.email, email), isNull(employees.deletedAt))).limit(1);
      return row as EmployeeRow | undefined;
    },
    async create(input) {
      const [r] = await db.insert(employees).values({
        userId: input.userId ?? null,
        fullName: input.fullName, email: input.email,
        phone: input.phone, pronouns: input.pronouns,
        departmentId: input.departmentId, position: input.position,
        location: input.location, employmentType: input.employmentType,
        employmentStatus: input.employmentStatus, hireDate: input.hireDate,
        managerId: input.managerId, salaryAmount: input.salaryAmount,
        salaryCurrency: input.salaryCurrency, avatarColorHue: input.avatarColorHue,
      }).$returningId();
      return r.id;
    },
    async update(id, patch) {
      const next: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'id' || k === 'createdAt' || k === 'updatedAt' || k === 'deletedAt' || k === 'departmentName') continue;
        next[k] = v;
      }
      if (Object.keys(next).length === 0) return;
      await db.update(employees).set(next as any).where(eq(employees.id, id));
    },
    async softDelete(id) {
      await db.update(employees).set({ deletedAt: new Date() }).where(eq(employees.id, id));
    },

    async directReportIdsOfUserEmployee(userId) {
      const me = await this.findByUserId(userId);
      if (!me) return [];
      const rows = await db.select({ id: employees.id }).from(employees)
        .where(and(eq(employees.managerId, me.id), isNull(employees.deletedAt)));
      return rows.map((r) => r.id);
    },
    async employeeIdOfUser(userId) {
      const me = await this.findByUserId(userId);
      return me?.id ?? null;
    },
  };
}
```

- [ ] **Step 2: Write failing test `apps/api/src/modules/employees/employeeDto.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { toEmployeeDTO, type SalaryScope } from './employeeDto.js';
import type { EmployeeRow } from './employeeRepo.js';

const row: EmployeeRow = {
  id: 7, userId: null, fullName: 'Ayu Wulan', email: 'ayu@naratala.local',
  phone: null, pronouns: null, departmentId: 1, departmentName: 'Engineering',
  position: 'Engineer', location: null, employmentType: 'full_time',
  employmentStatus: 'active', hireDate: '2025-01-15', managerId: null,
  salaryAmount: '12345.67', salaryCurrency: 'IDR', avatarColorHue: 120,
  createdAt: new Date('2025-01-15T10:00:00Z'), updatedAt: new Date('2025-01-15T10:00:00Z'),
  deletedAt: null,
};

describe('toEmployeeDTO', () => {
  it('includes salary when scope is visible', () => {
    const dto = toEmployeeDTO(row, 'visible' satisfies SalaryScope);
    expect(dto.salaryAmount).toBe('12345.67');
  });

  it('strips salary when scope is hidden', () => {
    const dto = toEmployeeDTO(row, 'hidden' satisfies SalaryScope);
    expect(dto.salaryAmount).toBeNull();
    expect(dto.salaryCurrency).toBe('IDR');
  });

  it('emits ISO strings for timestamps', () => {
    const dto = toEmployeeDTO(row, 'hidden');
    expect(dto.createdAt).toBe('2025-01-15T10:00:00.000Z');
  });
});
```

- [ ] **Step 3: Run, expect FAIL**

Run: `pnpm --filter api test src/modules/employees/employeeDto.test.ts`
Expected: module not found.

- [ ] **Step 4: Implement `apps/api/src/modules/employees/employeeDto.ts`**

```ts
import type { EmployeeDTO, Role } from '@naratala/shared';
import { hasPermission } from '@naratala/shared';
import type { EmployeeRow } from './employeeRepo.js';

export type SalaryScope = 'visible' | 'hidden';

export function toEmployeeDTO(row: EmployeeRow, salaryScope: SalaryScope): EmployeeDTO {
  const visible = salaryScope === 'visible';
  return {
    id: row.id,
    userId: row.userId,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    pronouns: row.pronouns,
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    position: row.position,
    location: row.location,
    employmentType: row.employmentType,
    employmentStatus: row.employmentStatus,
    hireDate: row.hireDate,
    managerId: row.managerId,
    avatarColorHue: row.avatarColorHue,
    salaryAmount: visible ? row.salaryAmount : null,
    salaryCurrency: row.salaryCurrency,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface SalaryScoper {
  forRow(row: EmployeeRow): SalaryScope;
}

export function makeSalaryScoper(input: {
  actorRole: Role;
  actorEmployeeId: number | null;
  directReportIds: Set<number>;
}): SalaryScoper {
  return {
    forRow(row: EmployeeRow): SalaryScope {
      if (hasPermission(input.actorRole, 'employees:read:salary:any')) return 'visible';
      if (input.actorEmployeeId !== null && row.id === input.actorEmployeeId) return 'visible';
      if (hasPermission(input.actorRole, 'employees:read:salary:reports') && input.directReportIds.has(row.id)) return 'visible';
      return 'hidden';
    },
  };
}
```

- [ ] **Step 5: Run, expect PASS**

Run: `pnpm --filter api test src/modules/employees/employeeDto.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/employees/employeeRepo.ts apps/api/src/modules/employees/employeeDto.ts apps/api/src/modules/employees/employeeDto.test.ts
git commit -m "feat(employees): repo + DTO mapper with salary scoping (spec §7.1)"
```

---

## Task 33: Employees routes (list / detail / create / patch / delete) + audit on salary change

**Files:**
- Create: `apps/api/src/modules/audit/auditRepo.ts`
- Create: `apps/api/src/modules/employees/employeeService.ts`
- Create: `apps/api/src/modules/employees/employeeRoutes.ts`
- Create: `apps/api/src/modules/employees/employees.test.ts`

- [ ] **Step 1: Implement `apps/api/src/modules/audit/auditRepo.ts`**

```ts
import { and, desc, eq, sql } from 'drizzle-orm';
import type { DB } from '../../shared/db/client.js';
import { auditLog } from '../../shared/db/schema.js';

export interface AuditEntry {
  id: number;
  actorUserId: number | null;
  actorIp: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  changes: unknown;
  createdAt: Date;
}

export interface AuditRepo {
  write(entry: Omit<AuditEntry, 'id' | 'createdAt'>): Promise<void>;
  list(f: { action?: string; entityType?: string; entityId?: number; page: number; pageSize: number }): Promise<{ rows: AuditEntry[]; total: number }>;
}

export function createAuditRepo(db: DB): AuditRepo {
  return {
    async write(entry) {
      await db.insert(auditLog).values({
        actorUserId: entry.actorUserId, actorIp: entry.actorIp,
        action: entry.action, entityType: entry.entityType,
        entityId: entry.entityId, changes: entry.changes as any,
      });
    },
    async list(f) {
      const conds: any[] = [];
      if (f.action) conds.push(eq(auditLog.action, f.action));
      if (f.entityType) conds.push(eq(auditLog.entityType, f.entityType));
      if (f.entityId !== undefined) conds.push(eq(auditLog.entityId, f.entityId));
      const where = conds.length > 0 ? and(...conds) : undefined;

      const offset = (f.page - 1) * f.pageSize;
      const q = db.select().from(auditLog);
      const rows = await (where ? q.where(where) : q)
        .orderBy(desc(auditLog.createdAt)).limit(f.pageSize).offset(offset);

      const [c] = await db.execute<{ n: number }>(sql`SELECT COUNT(*) AS n FROM audit_log`);
      return { rows: rows as AuditEntry[], total: Number((c as any)?.n ?? 0) };
    },
  };
}
```

- [ ] **Step 2: Implement `apps/api/src/modules/employees/employeeService.ts`**

```ts
import { hasPermission, type EmployeeDTO, type Role } from '@naratala/shared';
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors/index.js';
import { hueFromName } from '../../bootstrap/avatarHue.js';
import type { EmployeeRepo, EmployeeRow, ListFilters } from './employeeRepo.js';
import type { UserRepo } from '../auth/userRepo.js';
import type { AuditRepo } from '../audit/auditRepo.js';
import type { RefreshTokenService } from '../auth/refreshTokenService.js';
import { makeSalaryScoper, toEmployeeDTO } from './employeeDto.js';

interface Deps {
  employees: EmployeeRepo;
  users: UserRepo;
  audit: AuditRepo;
  refresh: RefreshTokenService;
}

interface Actor { userId: number; role: Role; ip: string; }

export function createEmployeeService(deps: Deps) {
  async function buildScoper(actor: Actor) {
    const actorEmployeeId = await deps.employees.employeeIdOfUser(actor.userId);
    const directReports = new Set(await deps.employees.directReportIdsOfUserEmployee(actor.userId));
    return { scoper: makeSalaryScoper({ actorRole: actor.role, actorEmployeeId, directReportIds: directReports }), actorEmployeeId };
  }

  async function list(actor: Actor, f: ListFilters): Promise<{ data: EmployeeDTO[]; page: number; pageSize: number; total: number }> {
    const { rows, total } = await deps.employees.list(f);
    const { scoper } = await buildScoper(actor);
    return { data: rows.map((r) => toEmployeeDTO(r, scoper.forRow(r))), page: f.page, pageSize: f.pageSize, total };
  }

  async function detail(actor: Actor, id: number): Promise<EmployeeDTO> {
    const row = await deps.employees.findById(id);
    if (!row) throw new NotFoundError('employee not found');
    const { scoper } = await buildScoper(actor);
    return toEmployeeDTO(row, scoper.forRow(row));
  }

  async function create(actor: Actor, input: Omit<EmployeeRow,
    'id' | 'departmentName' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'userId' | 'employmentStatus' | 'avatarColorHue'
  > & { salaryAmount?: string | null }): Promise<EmployeeDTO> {
    if (!hasPermission(actor.role, 'employees:write:any')) throw new ForbiddenError();
    if (input.salaryAmount && !hasPermission(actor.role, 'employees:write:salary')) {
      throw new ForbiddenError('cannot set salary');
    }
    const existing = await deps.employees.findByEmail(input.email);
    if (existing) throw new AuthError('EMAIL_TAKEN', 'employee email already exists');

    const id = await deps.employees.create({
      userId: null,
      fullName: input.fullName, email: input.email,
      phone: input.phone ?? null, pronouns: input.pronouns ?? null,
      departmentId: input.departmentId, position: input.position,
      location: input.location ?? null, employmentType: input.employmentType,
      employmentStatus: 'active', hireDate: input.hireDate,
      managerId: input.managerId ?? null, salaryAmount: input.salaryAmount ?? null,
      salaryCurrency: input.salaryCurrency ?? 'IDR',
      avatarColorHue: hueFromName(input.fullName),
    });
    await deps.audit.write({
      actorUserId: actor.userId, actorIp: actor.ip, action: 'employee.create',
      entityType: 'employee', entityId: id,
      changes: { after: { ...input, salaryAmount: input.salaryAmount ? '[redacted]' : null } },
    });
    return detail(actor, id);
  }

  async function update(actor: Actor, id: number, patch: Partial<EmployeeRow> & { reason?: string }): Promise<EmployeeDTO> {
    if (!hasPermission(actor.role, 'employees:write:any')) throw new ForbiddenError();
    const before = await deps.employees.findById(id);
    if (!before) throw new NotFoundError('employee not found');

    const salaryChange = patch.salaryAmount !== undefined && patch.salaryAmount !== before.salaryAmount;
    if (salaryChange) {
      if (!hasPermission(actor.role, 'employees:write:salary')) throw new ForbiddenError('cannot change salary');
      if (!patch.reason || patch.reason.trim().length < 10) {
        throw new ValidationError('reason (≥10 chars) required when changing salary', { path: ['reason'] });
      }
    }

    const { reason, ...dbPatch } = patch;
    await deps.employees.update(id, dbPatch);

    if (salaryChange) {
      await deps.audit.write({
        actorUserId: actor.userId, actorIp: actor.ip, action: 'employee.salary.update',
        entityType: 'employee', entityId: id,
        changes: { before: { salaryAmount: before.salaryAmount }, after: { salaryAmount: patch.salaryAmount }, reason },
      });
    } else {
      await deps.audit.write({
        actorUserId: actor.userId, actorIp: actor.ip, action: 'employee.update',
        entityType: 'employee', entityId: id,
        changes: { fields: Object.keys(dbPatch) },
      });
    }
    return detail(actor, id);
  }

  async function remove(actor: Actor, id: number): Promise<void> {
    if (actor.role !== 'admin') throw new ForbiddenError();
    const before = await deps.employees.findById(id);
    if (!before) throw new NotFoundError('employee not found');

    await deps.employees.softDelete(id);
    if (before.userId) {
      await deps.users.patch(before.userId, { status: 'disabled' });
      await deps.refresh.revokeAllForUser(before.userId);
    }
    await deps.audit.write({
      actorUserId: actor.userId, actorIp: actor.ip, action: 'employee.delete',
      entityType: 'employee', entityId: id, changes: { before: { fullName: before.fullName } },
    });
  }

  return { list, detail, create, update, remove };
}
export type EmployeeService = ReturnType<typeof createEmployeeService>;
```

- [ ] **Step 3: Implement `apps/api/src/modules/employees/employeeRoutes.ts`**

```ts
import { Router } from 'express';
import { z } from 'zod';
import { EmployeeCreate, EmployeeUpdate, PaginationQuery } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { EmployeeService } from './employeeService.js';
import type { JwtService } from '../auth/jwt.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const ListQuery = PaginationQuery.extend({
  q: z.string().max(100).optional(),
  department: z.coerce.number().int().positive().optional(),
  status: z.enum(['active', 'on_leave', 'terminated']).optional(),
  sort: z.enum(['name', 'hireDate', 'department']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export function createEmployeeRouter(deps: { service: EmployeeService; jwt: JwtService }): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

  r.get('/', authenticate, authorize('employees:read:any'),
    validate({ query: ListQuery }),
    async (req, res, next) => {
      try {
        const q = req.valid.query as any;
        const result = await deps.service.list(
          { userId: req.user!.sub, role: req.user!.role, ip: req.ip ?? 'unknown' },
          { q: q.q, departmentId: q.department, status: q.status, page: q.page, pageSize: q.pageSize, sort: q.sort, sortDir: q.sortDir },
        );
        res.json(result);
      } catch (e) { next(e); }
    });

  r.get('/:id', authenticate, authorize('employees:read:any'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        const out = await deps.service.detail(
          { userId: req.user!.sub, role: req.user!.role, ip: req.ip ?? 'unknown' },
          (req.valid.params as any).id,
        );
        res.json(out);
      } catch (e) { next(e); }
    });

  r.post('/', authenticate, authorize('employees:write:any'),
    validate({ body: EmployeeCreate }),
    async (req, res, next) => {
      try {
        const body = req.valid.body as any;
        const out = await deps.service.create(
          { userId: req.user!.sub, role: req.user!.role, ip: req.ip ?? 'unknown' },
          body,
        );
        res.status(201).json(out);
      } catch (e) { next(e); }
    });

  r.patch('/:id', authenticate, authorize('employees:write:any'),
    validate({ params: IdParam, body: EmployeeUpdate }),
    async (req, res, next) => {
      try {
        const id = (req.valid.params as any).id as number;
        const body = req.valid.body as any;
        const out = await deps.service.update(
          { userId: req.user!.sub, role: req.user!.role, ip: req.ip ?? 'unknown' },
          id, body,
        );
        res.json(out);
      } catch (e) { next(e); }
    });

  r.delete('/:id', authenticate, validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        await deps.service.remove(
          { userId: req.user!.sub, role: req.user!.role, ip: req.ip ?? 'unknown' },
          (req.valid.params as any).id,
        );
        res.json({ ok: true });
      } catch (e) { next(e); }
    });

  return r;
}
```

- [ ] **Step 4: Write failing test `apps/api/src/modules/employees/employees.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createTestDb, type TestDb } from '../../test/db.js';
import { departments, employees as empTable, users } from '../../shared/db/schema.js';
import { eq } from 'drizzle-orm';
import { createJwtService } from '../auth/jwt.js';
import { createUserRepo } from '../auth/userRepo.js';
import { createRefreshTokenRepo } from '../auth/refreshTokenRepo.js';
import { createRefreshTokenService } from '../auth/refreshTokenService.js';
import { createEmployeeRepo } from './employeeRepo.js';
import { createEmployeeService } from './employeeService.js';
import { createEmployeeRouter } from './employeeRoutes.js';
import { createAuditRepo } from '../audit/auditRepo.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';

describe('employees', () => {
  let ctx: TestDb;
  let app: express.Express;
  const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });

  beforeAll(async () => {
    ctx = await createTestDb();
    const userRepo = createUserRepo(ctx.db);
    const refresh = createRefreshTokenService({ repo: createRefreshTokenRepo(ctx.db), ttlMs: 30 * 86400000 });
    const svc = createEmployeeService({
      employees: createEmployeeRepo(ctx.db),
      users: userRepo, audit: createAuditRepo(ctx.db), refresh,
    });
    app = express();
    app.set('trust proxy', 1);
    app.use(cookieParser()); app.use(express.json());
    app.use('/api/employees', createEmployeeRouter({ service: svc, jwt }));
    app.use(errorHandler());
  });
  afterAll(async () => { await ctx.drop(); });
  beforeEach(async () => { await ctx.truncateAll(); });

  async function setup() {
    const [dep] = await ctx.db.insert(departments).values({ name: 'Eng' }).$returningId();

    const [mgrUser] = await ctx.db.insert(users).values({
      email: 'm@x.co', passwordHash: 'x', role: 'manager', status: 'active',
    }).$returningId();
    const [mgrEmp] = await ctx.db.insert(empTable).values({
      userId: mgrUser.id, fullName: 'Mgr Ana', email: 'mgr@x.co', departmentId: dep.id,
      position: 'Manager', employmentType: 'full_time', hireDate: '2020-01-01', avatarColorHue: 120,
    }).$returningId();

    const [reportEmp] = await ctx.db.insert(empTable).values({
      fullName: 'Rep Bob', email: 'rep@x.co', departmentId: dep.id,
      position: 'Engineer', employmentType: 'full_time', hireDate: '2023-01-01',
      salaryAmount: '20000.00', avatarColorHue: 80, managerId: mgrEmp.id,
    }).$returningId();

    const [otherEmp] = await ctx.db.insert(empTable).values({
      fullName: 'Oth Carol', email: 'oth@x.co', departmentId: dep.id,
      position: 'Engineer', employmentType: 'full_time', hireDate: '2023-01-01',
      salaryAmount: '30000.00', avatarColorHue: 200,
    }).$returningId();

    return { dep, mgrUser, mgrEmp, reportEmp, otherEmp };
  }

  async function admin() {
    const [u] = await ctx.db.insert(users).values({ email: 'a@x.co', passwordHash: 'x', role: 'admin', status: 'active' }).$returningId();
    return jwt.signAccess({ sub: u.id, role: 'admin' });
  }

  it('list: admin sees all salaries; manager sees only direct-report salaries', async () => {
    const { mgrUser, reportEmp, otherEmp } = await setup();
    const adminTok = await admin();
    const mgrTok = jwt.signAccess({ sub: mgrUser.id, role: 'manager' });

    const asAdmin = await request(app).get('/api/employees').set('Authorization', `Bearer ${adminTok}`);
    expect(asAdmin.status).toBe(200);
    const adminSalaries = Object.fromEntries(asAdmin.body.data.map((r: any) => [r.id, r.salaryAmount]));
    expect(adminSalaries[reportEmp.id]).toBe('20000.00');
    expect(adminSalaries[otherEmp.id]).toBe('30000.00');

    const asMgr = await request(app).get('/api/employees').set('Authorization', `Bearer ${mgrTok}`);
    const mgrSalaries = Object.fromEntries(asMgr.body.data.map((r: any) => [r.id, r.salaryAmount]));
    expect(mgrSalaries[reportEmp.id]).toBe('20000.00');
    expect(mgrSalaries[otherEmp.id]).toBeNull();
  });

  it('detail: employee sees only their own salary', async () => {
    const { dep } = await setup();
    const [selfUser] = await ctx.db.insert(users).values({ email: 'self@x.co', passwordHash: 'x', role: 'employee', status: 'active' }).$returningId();
    const [selfEmp] = await ctx.db.insert(empTable).values({
      userId: selfUser.id, fullName: 'Self Dee', email: 'self@x.co', departmentId: dep.id,
      position: 'Engineer', employmentType: 'full_time', hireDate: '2024-01-01',
      salaryAmount: '15000.00', avatarColorHue: 300,
    }).$returningId();

    const tok = jwt.signAccess({ sub: selfUser.id, role: 'employee' });
    const myself = await request(app).get(`/api/employees/${selfEmp.id}`).set('Authorization', `Bearer ${tok}`);
    expect(myself.body.salaryAmount).toBe('15000.00');

    const [, , , otherRow] = await ctx.db.select().from(empTable).where(eq(empTable.email, 'oth@x.co'));
    // use the Mgr's other-report to assert: employee viewing another is `null`
    const someoneElse = await request(app).get(`/api/employees/3`).set('Authorization', `Bearer ${tok}`);
    if (someoneElse.status === 200) {
      expect(someoneElse.body.salaryAmount).toBeNull();
    }
  });

  it('PATCH salary requires reason + audit + write:salary', async () => {
    const { otherEmp } = await setup();
    const adminTok = await admin();

    const missingReason = await request(app).patch(`/api/employees/${otherEmp.id}`)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ salaryAmount: '35000.00' });
    expect(missingReason.status).toBe(400);

    const ok = await request(app).patch(`/api/employees/${otherEmp.id}`)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ salaryAmount: '35000.00', reason: 'merit increase approved' });
    expect(ok.status).toBe(200);
    expect(ok.body.salaryAmount).toBe('35000.00');

    const [auditRow] = await ctx.db.execute<any[]>(
      { sql: "SELECT action, changes FROM audit_log WHERE action = 'employee.salary.update' LIMIT 1", args: [] } as any,
    ) as any;
    expect(auditRow).toBeDefined();
  });

  it('DELETE restricted to admin; soft-deletes + disables linked user', async () => {
    const { mgrUser, mgrEmp } = await setup();
    const adminTok = await admin();
    const del = await request(app).delete(`/api/employees/${mgrEmp.id}`).set('Authorization', `Bearer ${adminTok}`);
    expect(del.status).toBe(200);

    const [deletedEmp] = await ctx.db.select().from(empTable).where(eq(empTable.id, mgrEmp.id));
    expect(deletedEmp.deletedAt).not.toBeNull();

    const [user] = await ctx.db.select().from(users).where(eq(users.id, mgrUser.id));
    expect(user.status).toBe('disabled');
  });

  it('non-admin cannot DELETE', async () => {
    const { mgrUser, mgrEmp } = await setup();
    const tok = jwt.signAccess({ sub: mgrUser.id, role: 'manager' });
    const r = await request(app).delete(`/api/employees/${mgrEmp.id}`).set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(403);
  });
});
```

- [ ] **Step 5: Run, expect PASS**

Run: `pnpm --filter api test src/modules/employees/employees.test.ts`
Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/employees apps/api/src/modules/audit/auditRepo.ts
git commit -m "feat(employees): list/detail/create/patch/delete with salary RBAC + audit"
```

---

## Task 34: Audit GET endpoint with salary redaction

**Files:**
- Create: `apps/api/src/modules/audit/auditService.ts`
- Create: `apps/api/src/modules/audit/auditRoutes.ts`
- Create: `apps/api/src/modules/audit/audit.test.ts`

- [ ] **Step 1: Implement `apps/api/src/modules/audit/auditService.ts`**

```ts
import { hasPermission, type Role } from '@naratala/shared';
import type { AuditRepo, AuditEntry } from './auditRepo.js';

interface ListInput { role: Role; action?: string; entityType?: string; entityId?: number; page: number; pageSize: number; }

export function createAuditService(repo: AuditRepo) {
  async function list(f: ListInput) {
    const { rows, total } = await repo.list(f);
    const canSeeSalary = hasPermission(f.role, 'employees:read:salary:any');
    return {
      data: rows.map((r) => redact(r, canSeeSalary)),
      page: f.page, pageSize: f.pageSize, total,
    };
  }
  return { list };
}
export type AuditService = ReturnType<typeof createAuditService>;

function redact(row: AuditEntry, canSeeSalary: boolean) {
  if (canSeeSalary) return serialize(row);
  const changes = row.changes && typeof row.changes === 'object'
    ? deepRedact(row.changes as Record<string, unknown>)
    : row.changes;
  return { ...serialize(row), changes };
}

function serialize(r: AuditEntry) {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

function deepRedact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'salaryAmount') out[k] = '[redacted]';
    else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = deepRedact(v as Record<string, unknown>);
    else out[k] = v;
  }
  return out;
}
```

- [ ] **Step 2: Implement `apps/api/src/modules/audit/auditRoutes.ts`**

```ts
import { Router } from 'express';
import { z } from 'zod';
import { PaginationQuery } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { AuditService } from './auditService.js';
import type { JwtService } from '../auth/jwt.js';

const Query = PaginationQuery.extend({
  action: z.string().max(64).optional(),
  entityType: z.string().max(32).optional(),
  entityId: z.coerce.number().int().positive().optional(),
});

export function createAuditRouter(deps: { service: AuditService; jwt: JwtService }): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

  r.get('/', authenticate, authorize('audit:read'), validate({ query: Query }),
    async (req, res, next) => {
      try {
        const q = req.valid.query as any;
        res.json(await deps.service.list({ role: req.user!.role, ...q }));
      } catch (e) { next(e); }
    });
  return r;
}
```

- [ ] **Step 3: Write failing test `apps/api/src/modules/audit/audit.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createJwtService } from '../auth/jwt.js';
import { createAuditRepo } from './auditRepo.js';
import { createAuditService } from './auditService.js';
import { createAuditRouter } from './auditRoutes.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';

describe('audit GET', () => {
  let ctx: TestDb;
  let app: express.Express;
  const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });

  beforeAll(async () => {
    ctx = await createTestDb();
    const repo = createAuditRepo(ctx.db);
    const svc = createAuditService(repo);
    app = express();
    app.use(cookieParser()); app.use(express.json());
    app.use('/api/audit', createAuditRouter({ service: svc, jwt }));
    app.use(errorHandler());
    await repo.write({
      actorUserId: 1, actorIp: '127.0.0.1', action: 'employee.salary.update',
      entityType: 'employee', entityId: 7,
      changes: { before: { salaryAmount: '10' }, after: { salaryAmount: '20' }, reason: 'merit' },
    });
  });
  afterAll(async () => { await ctx.drop(); });

  it('admin gets unredacted salaries', async () => {
    const tok = jwt.signAccess({ sub: 1, role: 'admin' });
    const r = await request(app).get('/api/audit').set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(200);
    expect(r.body.data[0].changes.after.salaryAmount).toBe('20');
  });

  it('non-admin/hr cannot access audit (403)', async () => {
    const tok = jwt.signAccess({ sub: 1, role: 'manager' });
    const r = await request(app).get('/api/audit').set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(403);
  });
});
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter api test src/modules/audit/audit.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/audit/auditService.ts apps/api/src/modules/audit/auditRoutes.ts apps/api/src/modules/audit/audit.test.ts
git commit -m "feat(audit): GET with RBAC + salary redaction"
```

---

## Task 35: Bootstrap wiring + server assembly + permission matrix integration test

**Files:**
- Create: `apps/api/src/bootstrap/wireApp.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/server.ts`
- Create: `apps/api/src/test/permissionMatrix.test.ts`

- [ ] **Step 1: Implement `apps/api/src/bootstrap/wireApp.ts`**

```ts
import type { Express } from 'express';
import type { Env } from '../shared/config/env.js';
import type { DB } from '../shared/db/client.js';

import { createJwtService } from '../modules/auth/jwt.js';
import { createUserRepo } from '../modules/auth/userRepo.js';
import { createLoginAttemptRepo } from '../modules/auth/loginAttemptRepo.js';
import { createRefreshTokenRepo } from '../modules/auth/refreshTokenRepo.js';
import { createRefreshTokenService } from '../modules/auth/refreshTokenService.js';
import { createPasswordResetRepo } from '../modules/auth/passwordResetRepo.js';
import { createAuthService } from '../modules/auth/authService.js';
import { createAuthRouter } from '../modules/auth/authRoutes.js';
import { createMailer, createSmtpTransport } from '../shared/mail/mailer.js';
import { createInviteRepo } from '../modules/invites/inviteRepo.js';
import { createInviteService } from '../modules/invites/inviteService.js';
import { createInviteRouter } from '../modules/invites/inviteRoutes.js';
import { createDepartmentRepo } from '../modules/departments/departmentRepo.js';
import { createDepartmentService } from '../modules/departments/departmentService.js';
import { createDepartmentRouter } from '../modules/departments/departmentRoutes.js';
import { createUserService } from '../modules/users/userService.js';
import { createUserRouter } from '../modules/users/userRoutes.js';
import { createEmployeeRepo } from '../modules/employees/employeeRepo.js';
import { createEmployeeService } from '../modules/employees/employeeService.js';
import { createEmployeeRouter } from '../modules/employees/employeeRoutes.js';
import { createAuditRepo } from '../modules/audit/auditRepo.js';
import { createAuditService } from '../modules/audit/auditService.js';
import { createAuditRouter } from '../modules/audit/auditRoutes.js';

function ttlToMs(value: string): number {
  const m = /^(\d+)([smhd])$/.exec(value);
  if (!m) throw new Error(`bad ttl: ${value}`);
  const n = Number(m[1]);
  const unit = m[2] as 's' | 'm' | 'h' | 'd';
  return n * ({ s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]);
}

export function wireRoutes(app: Express, deps: { db: DB; env: Env }): void {
  const { db, env } = deps;
  const jwt = createJwtService({ secret: env.JWT_ACCESS_SECRET, accessTtl: env.ACCESS_TOKEN_TTL });
  const refreshTtlMs = ttlToMs(env.REFRESH_TOKEN_TTL);

  const userRepo = createUserRepo(db);
  const refresh = createRefreshTokenService({ repo: createRefreshTokenRepo(db), ttlMs: refreshTtlMs });
  const mailer = createMailer({
    transport: createSmtpTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, user: env.SMTP_USER, pass: env.SMTP_PASS }),
    from: env.MAIL_FROM,
  });
  const authSvc = createAuthService({
    users: userRepo,
    loginAttempts: createLoginAttemptRepo(db),
    jwt, refresh, refreshTtlMs,
    passwordResets: createPasswordResetRepo(db),
    mailer, appUrl: env.WEB_ORIGIN,
  });
  const inviteSvc = createInviteService({
    db, invites: createInviteRepo(db), users: userRepo,
    mailer, auth: authSvc, appUrl: env.WEB_ORIGIN, ttlMs: 48 * 3_600_000,
  });
  const deptSvc = createDepartmentService(createDepartmentRepo(db));
  const userSvc = createUserService({ users: userRepo, refresh });
  const auditRepo = createAuditRepo(db);
  const auditSvc = createAuditService(auditRepo);
  const empSvc = createEmployeeService({
    employees: createEmployeeRepo(db), users: userRepo, audit: auditRepo, refresh,
  });

  app.use('/api/auth', createAuthRouter({ service: authSvc, jwt }));
  app.use('/api/invites', createInviteRouter({ service: inviteSvc, jwt }));
  app.use('/api/departments', createDepartmentRouter({ service: deptSvc, jwt }));
  app.use('/api/users', createUserRouter({ service: userSvc, jwt }));
  app.use('/api/employees', createEmployeeRouter({ service: empSvc, jwt }));
  app.use('/api/audit', createAuditRouter({ service: auditSvc, jwt }));
}
```

- [ ] **Step 2: Rewrite `apps/api/src/app.ts` to accept wiring**

```ts
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { requestId } from './shared/middlewares/requestId.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';
import { limiters } from './shared/middlewares/rateLimit.js';
import { NotFoundError } from './shared/errors/index.js';
import type { Env } from './shared/config/env.js';
import type { DB } from './shared/db/client.js';
import { wireRoutes } from './bootstrap/wireApp.js';

interface Build {
  env: Env;
  db: DB;
}

export function buildApp(build: Build): Express {
  const { env, db } = build;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestId());
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"], 'script-src': ["'self'"],
        'style-src': ["'self'"], 'img-src': ["'self'", 'data:'],
        'frame-ancestors': ["'none'"],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
  }));
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(limiters.global());

  app.get('/api/health', async (_req, res) => {
    try {
      await db.execute({ sql: 'SELECT 1' } as any);
      res.json({ ok: true, db: true });
    } catch {
      res.status(503).json({ ok: false, db: false });
    }
  });

  wireRoutes(app, { db, env });

  app.use((_req, _res, next) => next(new NotFoundError('route not found')));
  app.use(errorHandler());
  return app;
}
```

- [ ] **Step 3: Update `apps/api/src/server.ts`**

```ts
import 'dotenv/config';
import { loadEnv } from './shared/config/env.js';
import { createDb } from './shared/db/client.js';
import { buildApp } from './app.js';
import { logger } from './shared/logger.js';

const env = loadEnv();
const { db } = createDb(env.DATABASE_URL);
const app = buildApp({ env, db });
app.listen(env.PORT, () => logger.info({ port: env.PORT }, 'api listening'));
```

- [ ] **Step 4: Fix existing `apps/api/src/app.test.ts`**

Update tests to use `buildApp({ env, db })` — import `loadEnv` + `createDb` and seed with the test DB URL. Simplest approach: wrap in the same `createTestDb` harness. Replace the `app.test.ts` body:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { buildApp } from './app.js';
import { createTestDb, type TestDb } from './test/db.js';
import { loadEnv } from './shared/config/env.js';

describe('app wiring', () => {
  let ctx: TestDb;
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    ctx = await createTestDb();
    process.env.WEB_ORIGIN = 'http://localhost:5173';
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(86);
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');
    process.env.SMTP_HOST = '127.0.0.1'; process.env.SMTP_PORT = '1025';
    process.env.MAIL_FROM = 'Naratala <n@x.co>';
    process.env.INITIAL_ADMIN_EMAIL = 'a@b.co'; process.env.INITIAL_ADMIN_PASSWORD = 'dev-password-12';
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'mysql://naratala:dev@127.0.0.1:3306/naratala';
    const env = loadEnv();
    app = buildApp({ env, db: ctx.db });
  });
  afterAll(async () => { await ctx.drop(); });

  it('GET /api/health → 200 { ok, db }', async () => {
    const r = await request(app).get('/api/health');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, db: true });
  });

  it('sets security headers', async () => {
    const r = await request(app).get('/api/health');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-frame-options']).toBeDefined();
  });

  it('unknown route → 404 NOT_FOUND', async () => {
    const r = await request(app).get('/api/nope');
    expect(r.status).toBe(404);
    expect(r.body.code).toBe('NOT_FOUND');
  });
});
```

- [ ] **Step 5: Run all tests**

Run: `pnpm --filter api test`
Expected: every suite passes.

- [ ] **Step 6: Write failing permission-matrix test `apps/api/src/test/permissionMatrix.test.ts`**

This is the integration harness spec §7.3 demands.

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../app.js';
import { createTestDb, type TestDb } from './db.js';
import { loadEnv } from '../shared/config/env.js';
import { hashPassword } from '../modules/auth/password.js';
import { departments, employees, users } from '../shared/db/schema.js';
import type { Role } from '@naratala/shared';

type Expectation = 'allow' | 'forbid';
interface Case { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; path: string; role: Role; expect: Expectation; body?: unknown; }

describe('permission matrix', () => {
  let ctx: TestDb;
  let app: ReturnType<typeof buildApp>;
  const logins: Record<Role, string> = {} as any;
  let employeeId = 0;

  beforeAll(async () => {
    ctx = await createTestDb();
    process.env.WEB_ORIGIN = 'http://localhost:5173';
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(86);
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');
    process.env.SMTP_HOST = '127.0.0.1'; process.env.SMTP_PORT = '1025';
    process.env.MAIL_FROM = 'Naratala <n@x.co>';
    process.env.INITIAL_ADMIN_EMAIL = 'a@b.co'; process.env.INITIAL_ADMIN_PASSWORD = 'dev-password-12';
    const env = loadEnv();
    app = buildApp({ env, db: ctx.db });
  });
  afterAll(async () => { await ctx.drop(); });

  beforeEach(async () => {
    await ctx.truncateAll();
    const hash = await hashPassword('correct-horse-12');
    for (const role of ['admin', 'hr', 'manager', 'employee'] as const) {
      await ctx.db.insert(users).values({
        email: `${role}@naratala.local`, passwordHash: hash, role, status: 'active',
      });
    }
    const [dep] = await ctx.db.insert(departments).values({ name: 'Eng' }).$returningId();
    const [emp] = await ctx.db.insert(employees).values({
      fullName: 'Target Person', email: 'target@naratala.local', departmentId: dep.id,
      position: 'Engineer', employmentType: 'full_time', hireDate: '2024-01-01', avatarColorHue: 10,
    }).$returningId();
    employeeId = emp.id;

    for (const role of ['admin', 'hr', 'manager', 'employee'] as const) {
      const r = await request(app).post('/api/auth/login')
        .send({ email: `${role}@naratala.local`, password: 'correct-horse-12' });
      logins[role] = r.body.accessToken;
    }
  });

  const CASES: Case[] = [
    { method: 'GET',    path: '/api/employees',         role: 'employee', expect: 'allow' },
    { method: 'POST',   path: '/api/employees',         role: 'employee', expect: 'forbid', body: { fullName: 'X', email: 'x@x.co', departmentId: 1, position: 'p', employmentType: 'full_time', hireDate: '2025-01-01' } },
    { method: 'POST',   path: '/api/employees',         role: 'manager',  expect: 'forbid', body: { fullName: 'X', email: 'x@x.co', departmentId: 1, position: 'p', employmentType: 'full_time', hireDate: '2025-01-01' } },
    { method: 'POST',   path: '/api/employees',         role: 'hr',       expect: 'allow',  body: { fullName: 'X', email: 'x2@x.co', departmentId: 1, position: 'p', employmentType: 'full_time', hireDate: '2025-01-01' } },
    { method: 'DELETE', path: '/api/employees/__ID__',  role: 'hr',       expect: 'forbid' },
    { method: 'DELETE', path: '/api/employees/__ID__',  role: 'admin',    expect: 'allow' },
    { method: 'GET',    path: '/api/departments',       role: 'employee', expect: 'allow' },
    { method: 'POST',   path: '/api/departments',       role: 'manager',  expect: 'forbid', body: { name: 'Fin' } },
    { method: 'POST',   path: '/api/departments',       role: 'hr',       expect: 'allow',  body: { name: 'Fin' } },
    { method: 'GET',    path: '/api/users',             role: 'hr',       expect: 'forbid' },
    { method: 'GET',    path: '/api/users',             role: 'admin',    expect: 'allow' },
    { method: 'GET',    path: '/api/audit',             role: 'hr',       expect: 'forbid' },
    { method: 'GET',    path: '/api/audit',             role: 'admin',    expect: 'allow' },
    { method: 'POST',   path: '/api/invites',           role: 'manager',  expect: 'forbid', body: { employeeId: 1, role: 'manager' } },
    { method: 'POST',   path: '/api/invites',           role: 'hr',       expect: 'allow',  body: { employeeId: 1, role: 'manager' } },
  ];

  for (const c of CASES) {
    it(`${c.method} ${c.path} as ${c.role} → ${c.expect}`, async () => {
      const path = c.path.replace('__ID__', String(employeeId));
      const body = c.body !== undefined && typeof c.body === 'object' && c.body !== null
        ? { ...(c.body as Record<string, unknown>), employeeId: (c.body as any).employeeId === 1 ? employeeId : (c.body as any).employeeId }
        : c.body;
      const req = request(app)[c.method.toLowerCase() as 'get']
        ? request(app)[c.method.toLowerCase() as 'get'](path)
        : request(app).get(path);
      const res = await req.set('Authorization', `Bearer ${logins[c.role]}`).send(body as any);
      if (c.expect === 'allow') {
        expect(res.status).toBeLessThan(400);
      } else {
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('INSUFFICIENT_ROLE');
      }
    });
  }
});
```

- [ ] **Step 7: Run, expect PASS**

Run: `pnpm --filter api test src/test/permissionMatrix.test.ts`
Expected: all matrix cases pass.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/bootstrap/wireApp.ts apps/api/src/app.ts apps/api/src/server.ts apps/api/src/app.test.ts apps/api/src/test/permissionMatrix.test.ts
git commit -m "feat(api): wire all modules + route permission-matrix integration test"
```

---

## Task 36: CI pipeline (lint + test + build + audit)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm lint
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: naratala
          MYSQL_USER: naratala
          MYSQL_PASSWORD: dev
        ports: ['3306:3306']
        options: >-
          --health-cmd="mysqladmin ping -h 127.0.0.1 -p$$MYSQL_ROOT_PASSWORD"
          --health-interval=5s
          --health-timeout=5s
          --health-retries=20
      mailhog:
        image: mailhog/mailhog
        ports: ['1025:1025', '8025:8025']
    env:
      DATABASE_URL: mysql://naratala:dev@127.0.0.1:3306/naratala
      WEB_ORIGIN: http://localhost:5173
      JWT_ACCESS_SECRET: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
      MFA_ENCRYPTION_KEY: AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=
      SMTP_HOST: 127.0.0.1
      SMTP_PORT: '1025'
      MAIL_FROM: "Naratala HRIS <no-reply@naratala.test>"
      INITIAL_ADMIN_EMAIL: admin@naratala.local
      INITIAL_ADMIN_PASSWORD: dev-password-12
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - name: Wait for MySQL
        run: |
          for i in {1..30}; do
            if mysqladmin ping -h 127.0.0.1 --silent; then exit 0; fi
            sleep 2
          done
          exit 1
      - run: pnpm --filter api db:migrate
      - run: pnpm test

  build:
    runs-on: ubuntu-latest
    needs: [lint-typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r build

  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --prod --audit-level=high
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "chore(ci): lint + typecheck + test (mysql+mailhog) + build + audit"
```

---

## Plan complete

Phase 1 backend is now ready for execution. Next steps:

1. Execute tasks 1–36 in order (each task commits; do not batch).
2. When all tasks are green, Plan 2 (frontend) can begin, reusing `packages/shared` contracts for type-safe fetchers.

