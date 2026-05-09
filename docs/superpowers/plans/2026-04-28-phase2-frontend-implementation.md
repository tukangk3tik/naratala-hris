# Phase 2 Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `apps/web` — a Vite + React + TypeScript SPA that wires the Phase 1 backend (auth, employees, departments, users, audit, invites) into a working product.

**Architecture:** New workspace package `apps/web/` peer to `apps/api/`. React 18 + React Router v6 + TanStack Query v5. Auth via in-memory access token + refresh cookie + single-flight refresh. Forms via React Hook Form + `zodResolver` against `@naratala/shared` schemas. Component tests with Vitest + Testing Library + MSW (no e2e in Plan 2).

**Tech Stack:** Vite 5, React 18, TypeScript 5.6 (strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), React Router 6, TanStack Query 5, React Hook Form 7 + `@hookform/resolvers`, Zod 3, `react-i18next` 14, `sonner` 1 (toasts), `qrcode.react` 4, `@tanstack/react-virtual` 3, `msw` 2, `@testing-library/react` 16, `@testing-library/user-event` 14, `@testing-library/jest-dom` 6, `vitest` 2.

**Reference spec:** `docs/superpowers/specs/2026-04-27-phase2-frontend-design.md`

---

## File Structure

Each unit listed has one focused responsibility; tests live next to source as `*.test.ts(x)`.

```
apps/web/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── index.html
└── src/
    ├── main.tsx                                # bootstrap
    ├── styles.css                              # verbatim copy of root styles.css
    │
    ├── app/
    │   ├── App.tsx                             # providers + Outlet
    │   ├── routes.tsx                          # React Router v6 tree
    │   ├── RequireAuth.tsx                     # auth gate
    │   ├── RequirePermission.tsx               # permission gate
    │   ├── Forbidden.tsx                       # 403 page
    │   └── NotFound.tsx                        # 404 page
    │
    ├── shared/
    │   ├── api/
    │   │   ├── ApiError.ts                     # typed error class
    │   │   ├── tokenStore.ts                   # in-memory access token + listeners
    │   │   ├── client.ts                       # apiFetch + single-flight refresh
    │   │   └── queries.ts                      # qk key factory + QueryClient defaults
    │   ├── auth/
    │   │   ├── AuthProvider.tsx                # context provider, boot via /me
    │   │   └── useAuth.ts                      # consumer hook
    │   ├── permissions/
    │   │   └── usePermission.ts                # role-based check
    │   ├── i18n/
    │   │   ├── index.ts                        # i18next init
    │   │   └── locales/
    │   │       ├── id.json
    │   │       └── en.json
    │   └── ui/
    │       ├── Shell.tsx                       # layout: sidebar + main
    │       ├── Sidebar.tsx                     # nav (permission-gated items)
    │       ├── TopBar.tsx                      # title + avatar menu
    │       ├── FullPageSpinner.tsx
    │       ├── Avatar.tsx
    │       ├── Pill.tsx
    │       ├── Card.tsx
    │       ├── Modal.tsx
    │       ├── Drawer.tsx
    │       ├── ConfirmDialog.tsx
    │       ├── EmptyState.tsx
    │       └── ErrorBoundary.tsx
    │
    ├── features/
    │   ├── auth/
    │   │   ├── LoginPage.tsx
    │   │   ├── MfaChallengePage.tsx
    │   │   ├── ForgotPasswordPage.tsx
    │   │   ├── ResetPasswordPage.tsx
    │   │   ├── AcceptInvitePage.tsx
    │   │   └── PasswordStrengthMeter.tsx
    │   ├── employees/
    │   │   ├── EmployeesPage.tsx
    │   │   ├── EmployeeFilters.tsx
    │   │   ├── EmployeeTable.tsx
    │   │   ├── EmployeeDrawer.tsx
    │   │   ├── EmployeeForm.tsx
    │   │   └── hooks.ts
    │   ├── departments/
    │   │   ├── DepartmentsPage.tsx
    │   │   ├── DepartmentRow.tsx
    │   │   └── hooks.ts
    │   ├── users/
    │   │   ├── UsersPage.tsx
    │   │   ├── UserEditModal.tsx
    │   │   └── hooks.ts
    │   ├── audit/
    │   │   ├── AuditPage.tsx
    │   │   ├── AuditRow.tsx
    │   │   └── hooks.ts
    │   └── settings/
    │       ├── ProfilePage.tsx
    │       ├── ChangePasswordCard.tsx
    │       ├── MfaCard.tsx
    │       └── LanguageSwitcher.tsx
    │
    └── test/
        ├── setup.ts                            # vitest global setup
        ├── server.ts                           # msw node server
        ├── handlers.ts                         # default API handlers
        ├── utils.tsx                           # renderWithProviders
        └── fixtures.ts                         # canonical test data
```

---

## Task 1: Scaffold `apps/web`

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/styles.css` (copy of root `styles.css`)
- Create: `apps/web/src/app/App.tsx`
- Modify: `.eslintignore` (allow `apps/web/src`)
- Modify: `.prettierignore` (allow `apps/web/src`)

- [ ] **Step 1.1: Create `apps/web/package.json`**

```json
{
  "name": "web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview --port 5173",
    "typecheck": "tsc --noEmit",
    "lint": "eslint \"src/**/*.{ts,tsx}\"",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@hookform/resolvers": "3.9.0",
    "@naratala/shared": "workspace:*",
    "@tanstack/react-query": "5.59.0",
    "@tanstack/react-virtual": "3.10.8",
    "i18next": "23.15.1",
    "qrcode.react": "4.0.1",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-hook-form": "7.53.0",
    "react-i18next": "15.0.2",
    "react-router-dom": "6.26.2",
    "sonner": "1.5.0",
    "zod": "3.23.8"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "6.5.0",
    "@testing-library/react": "16.0.1",
    "@testing-library/user-event": "14.5.2",
    "@types/node": "20.16.10",
    "@types/react": "18.3.10",
    "@types/react-dom": "18.3.0",
    "@vitejs/plugin-react": "4.3.1",
    "jsdom": "25.0.1",
    "msw": "2.4.9",
    "typescript": "5.6.2",
    "vite": "5.4.8",
    "vitest": "2.1.1"
  }
}
```

- [ ] **Step 1.2: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "node"],
    "outDir": "dist",
    "noEmit": true,
    "paths": {
      "@naratala/shared": ["../../packages/shared/src/index.ts"],
      "@naratala/shared/*": ["../../packages/shared/src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

- [ ] **Step 1.3: Create `apps/web/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@naratala/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
```

- [ ] **Step 1.4: Create `apps/web/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
  resolve: {
    alias: {
      '@naratala/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
```

- [ ] **Step 1.5: Create `apps/web/index.html`**

```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Naratala HRIS</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 1.6: Copy `styles.css` verbatim**

```bash
cp styles.css apps/web/src/styles.css
```

- [ ] **Step 1.7: Create minimal `App.tsx` (smoke render)**

```tsx
// apps/web/src/app/App.tsx
export function App(): JSX.Element {
  return <div data-testid="app-root">Naratala</div>;
}
```

- [ ] **Step 1.8: Create `main.tsx`**

```tsx
// apps/web/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './app/App.js';

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 1.9: Update `.eslintignore` — allow `apps/web/src`**

Replace contents:
```
node_modules
dist
build
coverage
components/
styles.css
index.html
```

(Note: `apps/web/src/styles.css` is still ignored because `styles.css` matches it; that's fine — we don't lint CSS.)

- [ ] **Step 1.10: Update `.prettierignore` — allow `apps/web/src`**

Replace contents:
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
docs/
pnpm-lock.yaml
```

- [ ] **Step 1.11: Install dependencies**

Run: `pnpm install`
Expected: lockfile updated; no errors.

- [ ] **Step 1.12: Verify scaffold builds**

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: typecheck passes; `apps/web/dist/index.html` produced.

- [ ] **Step 1.13: Commit**

```bash
git add apps/web/ .eslintignore .prettierignore pnpm-lock.yaml package.json
git commit -m "feat(web): scaffold apps/web Vite+React+TS package"
```

---

## Task 2: `ApiError` typed error class

**Files:**
- Create: `apps/web/src/shared/api/ApiError.ts`
- Create: `apps/web/src/shared/api/ApiError.test.ts`

- [ ] **Step 2.1: Write the failing test**

```ts
// apps/web/src/shared/api/ApiError.test.ts
import { describe, it, expect } from 'vitest';
import { ApiError } from './ApiError.js';

describe('ApiError', () => {
  it('captures code, message, status, and fields', () => {
    const e = new ApiError('VALIDATION_FAILED', 'bad', 400, { name: ['required'] });
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('VALIDATION_FAILED');
    expect(e.message).toBe('bad');
    expect(e.status).toBe(400);
    expect(e.fields).toEqual({ name: ['required'] });
    expect(e.name).toBe('ApiError');
  });

  it('works without status / fields', () => {
    const e = new ApiError('NETWORK', 'offline');
    expect(e.status).toBeUndefined();
    expect(e.fields).toBeUndefined();
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

Run: `pnpm --filter web test ApiError`
Expected: FAIL ("Cannot find module './ApiError.js'").

- [ ] **Step 2.3: Implement `ApiError`**

```ts
// apps/web/src/shared/api/ApiError.ts
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

- [ ] **Step 2.4: Run test to verify it passes**

Run: `pnpm --filter web test ApiError`
Expected: PASS (2 tests).

- [ ] **Step 2.5: Commit**

```bash
git add apps/web/src/shared/api/ApiError.ts apps/web/src/shared/api/ApiError.test.ts
git commit -m "feat(web): typed ApiError class"
```

---

## Task 3: API client + token store + single-flight refresh

**Files:**
- Create: `apps/web/src/shared/api/tokenStore.ts`
- Create: `apps/web/src/shared/api/client.ts`
- Create: `apps/web/src/shared/api/client.test.ts`
- Create: `apps/web/src/test/setup.ts`
- Create: `apps/web/src/test/server.ts`
- Create: `apps/web/src/test/handlers.ts`
- Create: `apps/web/src/test/fixtures.ts`

- [ ] **Step 3.1: Create test infra — `setup.ts`**

```ts
// apps/web/src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server.js';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- [ ] **Step 3.2: Create `fixtures.ts`**

```ts
// apps/web/src/test/fixtures.ts
import type { UserDTO, EmployeeDTO, DepartmentDTO } from '@naratala/shared';

export const adminUser: UserDTO = {
  id: 1,
  email: 'admin@naratala.local',
  role: 'admin',
  status: 'active',
  language: 'en',
  mfaEnabled: false,
  mustChangePassword: false,
  lastLoginAt: '2026-04-28T00:00:00.000Z',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-28T00:00:00.000Z',
};

export const employeeUser: UserDTO = { ...adminUser, id: 2, email: 'emp@naratala.local', role: 'employee' };
export const hrUser: UserDTO = { ...adminUser, id: 3, email: 'hr@naratala.local', role: 'hr' };
export const managerUser: UserDTO = { ...adminUser, id: 4, email: 'mgr@naratala.local', role: 'manager' };

export const dept: DepartmentDTO = {
  id: 1,
  name: 'Engineering',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

export const sampleEmployee: EmployeeDTO = {
  id: 10,
  userId: 2,
  fullName: 'Sample Person',
  email: 'sample@naratala.local',
  phone: null,
  pronouns: null,
  departmentId: 1,
  departmentName: 'Engineering',
  position: 'Engineer',
  location: null,
  employmentType: 'full_time',
  employmentStatus: 'active',
  hireDate: '2024-01-01',
  managerId: null,
  avatarColorHue: 12,
  salaryAmount: '15000000.00',
  salaryCurrency: 'IDR',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};
```

- [ ] **Step 3.3: Create default `handlers.ts`**

```ts
// apps/web/src/test/handlers.ts
import { http, HttpResponse } from 'msw';
import { adminUser, dept, sampleEmployee } from './fixtures.js';

export const defaultHandlers = [
  http.get('/api/auth/me', () => HttpResponse.json({ user: adminUser })),
  http.post('/api/auth/login', () => HttpResponse.json({ accessToken: 'test-access', user: adminUser })),
  http.post('/api/auth/refresh', () => HttpResponse.json({ accessToken: 'refreshed', user: adminUser })),
  http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/departments', () => HttpResponse.json({ data: [dept] })),
  http.get('/api/employees', () =>
    HttpResponse.json({ data: [sampleEmployee], page: 1, pageSize: 25, total: 1 }),
  ),
  http.get('/api/employees/:id', ({ params }) =>
    HttpResponse.json({ ...sampleEmployee, id: Number(params.id) }),
  ),
  http.get('/api/users', () => HttpResponse.json({ data: [adminUser], page: 1, pageSize: 25, total: 1 })),
  http.get('/api/audit', () => HttpResponse.json({ data: [], page: 1, pageSize: 25, total: 0 })),
];
```

- [ ] **Step 3.4: Create `server.ts`**

```ts
// apps/web/src/test/server.ts
import { setupServer } from 'msw/node';
import { defaultHandlers } from './handlers.js';

export const server = setupServer(...defaultHandlers);
```

- [ ] **Step 3.5: Write the failing test for `tokenStore`**

```ts
// apps/web/src/shared/api/client.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { apiFetch, configureClient } from './client.js';
import { tokenStore } from './tokenStore.js';
import { ApiError } from './ApiError.js';
import { z } from 'zod';

describe('apiFetch', () => {
  beforeEach(() => {
    tokenStore.set(null);
    configureClient({ onSignOut: vi.fn() });
  });

  it('attaches Bearer when token present and parses with schema', async () => {
    tokenStore.set('access-1');
    server.use(
      http.get('/api/test', ({ request }) => {
        if (request.headers.get('authorization') !== 'Bearer access-1') {
          return new HttpResponse(null, { status: 500 });
        }
        return HttpResponse.json({ ok: true });
      }),
    );
    const result = await apiFetch('/api/test', { schema: z.object({ ok: z.boolean() }) });
    expect(result).toEqual({ ok: true });
  });

  it('on 401 calls /refresh once, retries, then succeeds', async () => {
    let firstCall = true;
    let refreshes = 0;
    server.use(
      http.get('/api/test', () => {
        if (firstCall) {
          firstCall = false;
          return new HttpResponse(JSON.stringify({ code: 'TOKEN_EXPIRED', message: '' }), {
            status: 401,
          });
        }
        return HttpResponse.json({ ok: true });
      }),
      http.post('/api/auth/refresh', () => {
        refreshes++;
        return HttpResponse.json({ accessToken: 'fresh' });
      }),
    );
    const r = await apiFetch('/api/test', { schema: z.object({ ok: z.boolean() }) });
    expect(r).toEqual({ ok: true });
    expect(refreshes).toBe(1);
    expect(tokenStore.get()).toBe('fresh');
  });

  it('two concurrent 401s share a single refresh', async () => {
    let refreshes = 0;
    let first = true;
    let second = true;
    server.use(
      http.get('/api/a', () => {
        if (first) {
          first = false;
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({ tag: 'a' });
      }),
      http.get('/api/b', () => {
        if (second) {
          second = false;
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({ tag: 'b' });
      }),
      http.post('/api/auth/refresh', async () => {
        refreshes++;
        await new Promise((r) => setTimeout(r, 20));
        return HttpResponse.json({ accessToken: 'shared' });
      }),
    );
    const [a, b] = await Promise.all([
      apiFetch('/api/a', { schema: z.object({ tag: z.string() }) }),
      apiFetch('/api/b', { schema: z.object({ tag: z.string() }) }),
    ]);
    expect(a).toEqual({ tag: 'a' });
    expect(b).toEqual({ tag: 'b' });
    expect(refreshes).toBe(1);
  });

  it('refresh failure → calls onSignOut', async () => {
    const onSignOut = vi.fn();
    configureClient({ onSignOut });
    server.use(
      http.get('/api/test', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 })),
    );
    await expect(
      apiFetch('/api/test', { schema: z.object({ ok: z.boolean() }) }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(onSignOut).toHaveBeenCalled();
  });

  it('400 with details.fields populates ApiError.fields', async () => {
    server.use(
      http.post('/api/test', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_FAILED',
            message: 'invalid',
            details: { fields: { email: ['required'] } },
          },
          { status: 400 },
        ),
      ),
    );
    try {
      await apiFetch('/api/test', { method: 'POST', body: {} });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.code).toBe('VALIDATION_FAILED');
      expect(err.status).toBe(400);
      expect(err.fields).toEqual({ email: ['required'] });
    }
  });
});
```

- [ ] **Step 3.6: Run test to verify it fails**

Run: `pnpm --filter web test client`
Expected: FAIL — modules don't exist.

- [ ] **Step 3.7: Implement `tokenStore.ts`**

```ts
// apps/web/src/shared/api/tokenStore.ts
type Listener = (token: string | null) => void;
let token: string | null = null;
const listeners = new Set<Listener>();

export const tokenStore = {
  get: (): string | null => token,
  set: (t: string | null): void => {
    token = t;
    for (const l of listeners) l(t);
  },
  subscribe: (l: Listener): (() => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
```

- [ ] **Step 3.8: Implement `client.ts`**

```ts
// apps/web/src/shared/api/client.ts
import type { ZodSchema } from 'zod';
import { ApiError } from './ApiError.js';
import { tokenStore } from './tokenStore.js';

interface Config {
  onSignOut: () => void;
}
let config: Config = { onSignOut: () => {} };

export function configureClient(next: Partial<Config>): void {
  config = { ...config, ...next };
}

interface FetchOpts<T> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  schema?: ZodSchema<T>;
  signal?: AbortSignal;
}

let refreshPromise: Promise<boolean> | null = null;

async function refresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const json = (await res.json()) as { accessToken?: string };
      if (typeof json.accessToken !== 'string') return false;
      tokenStore.set(json.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => {
        refreshPromise = null;
      }, 0);
    }
  })();
  return refreshPromise;
}

async function doFetch<T>(path: string, opts: FetchOpts<T>): Promise<Response> {
  const headers: Record<string, string> = {};
  const tok = tokenStore.get();
  if (tok) headers['Authorization'] = `Bearer ${tok}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const init: RequestInit = {
    method: opts.method ?? 'GET',
    credentials: 'include',
    headers,
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  if (opts.signal) init.signal = opts.signal;
  return fetch(path, init);
}

export async function apiFetch<T = unknown>(path: string, opts: FetchOpts<T> = {}): Promise<T> {
  let res: Response;
  try {
    res = await doFetch(path, opts);
  } catch (e) {
    throw new ApiError('NETWORK', e instanceof Error ? e.message : 'network error');
  }

  if (res.status === 401 && !path.includes('/api/auth/refresh') && !path.includes('/api/auth/login')) {
    const ok = await refresh();
    if (!ok) {
      config.onSignOut();
      throw new ApiError('TOKEN_EXPIRED', 'session expired', 401);
    }
    try {
      res = await doFetch(path, opts);
    } catch (e) {
      throw new ApiError('NETWORK', e instanceof Error ? e.message : 'network error');
    }
    if (res.status === 401) {
      config.onSignOut();
      throw new ApiError('TOKEN_EXPIRED', 'session expired', 401);
    }
  }

  if (res.status === 204) return undefined as T;

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const b = body as { code?: string; message?: string; details?: { fields?: Record<string, string[]> } } | null;
    const code = b?.code ?? 'INTERNAL_ERROR';
    const msg = b?.message ?? 'request failed';
    throw new ApiError(code, msg, res.status, b?.details?.fields);
  }

  if (opts.schema) {
    const parsed = opts.schema.safeParse(body);
    if (!parsed.success) throw new ApiError('VALIDATION_FAILED', 'response shape mismatch', res.status);
    return parsed.data;
  }
  return body as T;
}
```

- [ ] **Step 3.9: Run tests — verify all 5 pass**

Run: `pnpm --filter web test client`
Expected: PASS (5 tests).

- [ ] **Step 3.10: Commit**

```bash
git add apps/web/src/shared/api/ apps/web/src/test/
git commit -m "feat(web): apiFetch with single-flight refresh + msw test infra"
```

---

## Task 4: Query key factory

**Files:**
- Create: `apps/web/src/shared/api/queries.ts`
- Create: `apps/web/src/shared/api/queries.test.ts`

- [ ] **Step 4.1: Write failing test**

```ts
// apps/web/src/shared/api/queries.test.ts
import { describe, it, expect } from 'vitest';
import { qk, makeQueryClient } from './queries.js';

describe('query keys', () => {
  it('produces stable keys per filter shape', () => {
    expect(qk.employees.list({ page: 1, q: 'a' })).toEqual(['employees', 'list', { page: 1, q: 'a' }]);
    expect(qk.employees.detail(7)).toEqual(['employees', 'detail', 7]);
    expect(qk.departments.all()).toEqual(['departments', 'all']);
    expect(qk.users.list({ page: 1 })).toEqual(['users', 'list', { page: 1 }]);
    expect(qk.audit.list({ page: 1 })).toEqual(['audit', 'list', { page: 1 }]);
    expect(qk.me()).toEqual(['auth', 'me']);
  });

  it('makeQueryClient sets safe defaults', () => {
    const c = makeQueryClient();
    const def = c.getDefaultOptions();
    expect(def.queries?.staleTime).toBe(30_000);
    expect(def.queries?.refetchOnWindowFocus).toBe(false);
  });
});
```

- [ ] **Step 4.2: Run — fails**

Run: `pnpm --filter web test queries`
Expected: FAIL.

- [ ] **Step 4.3: Implement**

```ts
// apps/web/src/shared/api/queries.ts
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './ApiError.js';

export const qk = {
  me: () => ['auth', 'me'] as const,
  employees: {
    list: (filters: Record<string, unknown>) => ['employees', 'list', filters] as const,
    detail: (id: number) => ['employees', 'detail', id] as const,
  },
  departments: { all: () => ['departments', 'all'] as const },
  users: { list: (filters: Record<string, unknown>) => ['users', 'list', filters] as const },
  audit: { list: (filters: Record<string, unknown>) => ['audit', 'list', filters] as const },
};

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (n, err) => err instanceof ApiError && err.code === 'NETWORK' && n < 2,
      },
      mutations: { retry: false },
    },
  });
}
```

- [ ] **Step 4.4: Run — passes**

Run: `pnpm --filter web test queries`
Expected: PASS.

- [ ] **Step 4.5: Commit**

```bash
git add apps/web/src/shared/api/queries.ts apps/web/src/shared/api/queries.test.ts
git commit -m "feat(web): qk key factory + QueryClient defaults"
```

---

## Task 5: AuthProvider + boot sequence

**Files:**
- Create: `apps/web/src/shared/auth/AuthProvider.tsx`
- Create: `apps/web/src/shared/auth/useAuth.ts`
- Create: `apps/web/src/shared/auth/AuthProvider.test.tsx`
- Create: `apps/web/src/test/utils.tsx`

- [ ] **Step 5.1: Create test utils**

```tsx
// apps/web/src/test/utils.tsx
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';
import { makeQueryClient } from '../shared/api/queries.js';
import { AuthProvider } from '../shared/auth/AuthProvider.js';
import { Toaster } from 'sonner';

interface Opts extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

export function renderWithProviders(ui: ReactElement, opts: Opts = {}) {
  const client = makeQueryClient();
  client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[opts.route ?? '/']}>
          <AuthProvider>{children}</AuthProvider>
          <Toaster />
        </MemoryRouter>
      </QueryClientProvider>
    );
  }
  return { ...render(ui, { wrapper: Wrapper, ...opts }), client };
}
```

- [ ] **Step 5.2: Write failing test**

```tsx
// apps/web/src/shared/auth/AuthProvider.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { useAuth } from './useAuth.js';
import { adminUser } from '../../test/fixtures.js';
import { tokenStore } from '../api/tokenStore.js';
import { waitFor, screen } from '@testing-library/react';

function Probe() {
  const { status, user } = useAuth();
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="email">{user?.email ?? '-'}</div>
    </div>
  );
}

describe('AuthProvider', () => {
  it('boots → loading → authenticated when /me returns 200', async () => {
    tokenStore.set('any');
    renderWithProviders(<Probe />);
    expect(screen.getByTestId('status').textContent).toBe('loading');
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    expect(screen.getByTestId('email').textContent).toBe(adminUser.email);
  });

  it('boots → unauthenticated when /me returns 401 and refresh fails', async () => {
    tokenStore.set(null);
    server.use(
      http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 })),
    );
    renderWithProviders(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
  });
});
```

- [ ] **Step 5.3: Run — fails**

Run: `pnpm --filter web test AuthProvider`
Expected: FAIL — module missing.

- [ ] **Step 5.4: Implement `useAuth.ts` + `AuthProvider.tsx`**

```ts
// apps/web/src/shared/auth/useAuth.ts
import { createContext, useContext } from 'react';
import type { UserDTO } from '@naratala/shared';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthValue {
  status: AuthStatus;
  user: UserDTO | null;
  setAuth: (v: { user: UserDTO; accessToken: string }) => void;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
```

```tsx
// apps/web/src/shared/auth/AuthProvider.tsx
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { UserDTO } from '@naratala/shared';
import { z } from 'zod';
import { apiFetch, configureClient } from '../api/client.js';
import { tokenStore } from '../api/tokenStore.js';
import { AuthContext, type AuthStatus } from './useAuth.js';

const MeResponse = z.object({
  user: z.object({
    id: z.number(),
    email: z.string(),
    role: z.enum(['admin', 'hr', 'manager', 'employee']),
    status: z.enum(['pending', 'active', 'disabled']),
    language: z.enum(['id', 'en']),
    mfaEnabled: z.boolean(),
    mustChangePassword: z.boolean(),
    lastLoginAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserDTO | null>(null);

  const signOut = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    tokenStore.set(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const r = await apiFetch('/api/auth/me', { schema: MeResponse });
      setUser(r.user as UserDTO);
      setStatus('authenticated');
    } catch {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const setAuth = useCallback((v: { user: UserDTO; accessToken: string }) => {
    tokenStore.set(v.accessToken);
    setUser(v.user);
    setStatus('authenticated');
  }, []);

  useEffect(() => {
    configureClient({ onSignOut: () => void signOut() });
  }, [signOut]);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const value = useMemo(
    () => ({ status, user, setAuth, signOut, refreshMe }),
    [status, user, setAuth, signOut, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

- [ ] **Step 5.5: Run — passes**

Run: `pnpm --filter web test AuthProvider`
Expected: PASS (2 tests).

- [ ] **Step 5.6: Commit**

```bash
git add apps/web/src/shared/auth/ apps/web/src/test/utils.tsx
git commit -m "feat(web): AuthProvider + useAuth + /me boot"
```

---

## Task 6: Routing + RequireAuth + RequirePermission

**Files:**
- Create: `apps/web/src/app/RequireAuth.tsx`
- Create: `apps/web/src/app/RequirePermission.tsx`
- Create: `apps/web/src/app/Forbidden.tsx`
- Create: `apps/web/src/app/NotFound.tsx`
- Create: `apps/web/src/app/routes.tsx`
- Create: `apps/web/src/shared/permissions/usePermission.ts`
- Create: `apps/web/src/shared/ui/FullPageSpinner.tsx`
- Create: `apps/web/src/app/RequireAuth.test.tsx`
- Create: `apps/web/src/app/RequirePermission.test.tsx`
- Modify: `apps/web/src/app/App.tsx`

- [ ] **Step 6.1: Create `FullPageSpinner.tsx`**

```tsx
// apps/web/src/shared/ui/FullPageSpinner.tsx
export function FullPageSpinner(): JSX.Element {
  return (
    <div role="status" aria-label="loading" className="nt-fullpage-spinner">
      Loading…
    </div>
  );
}
```

- [ ] **Step 6.2: Create `usePermission.ts`**

```ts
// apps/web/src/shared/permissions/usePermission.ts
import { hasPermission, type Permission } from '@naratala/shared';
import { useAuth } from '../auth/useAuth.js';

export function usePermission(perm: Permission): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return hasPermission(user.role, perm);
}
```

- [ ] **Step 6.3: Create `Forbidden.tsx` and `NotFound.tsx`**

```tsx
// apps/web/src/app/Forbidden.tsx
export function Forbidden(): JSX.Element {
  return <div data-testid="forbidden-page">403 — You don't have access to this page.</div>;
}
```

```tsx
// apps/web/src/app/NotFound.tsx
export function NotFound(): JSX.Element {
  return <div data-testid="notfound-page">404 — Page not found.</div>;
}
```

- [ ] **Step 6.4: Write failing test for `RequireAuth`**

```tsx
// apps/web/src/app/RequireAuth.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Routes, Route } from 'react-router-dom';
import { server } from '../test/server.js';
import { renderWithProviders } from '../test/utils.js';
import { RequireAuth } from './RequireAuth.js';
import { screen, waitFor } from '@testing-library/react';

function Secret() {
  return <div>secret</div>;
}
function LoginStub() {
  return <div data-testid="login-stub">login</div>;
}

describe('RequireAuth', () => {
  it('renders Outlet when authenticated', async () => {
    renderWithProviders(
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/secret" element={<Secret />} />
        </Route>
        <Route path="/login" element={<LoginStub />} />
      </Routes>,
      { route: '/secret' },
    );
    await waitFor(() => expect(screen.getByText('secret')).toBeInTheDocument());
  });

  it('redirects to /login when unauthenticated', async () => {
    server.use(
      http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 })),
    );
    renderWithProviders(
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/secret" element={<Secret />} />
        </Route>
        <Route path="/login" element={<LoginStub />} />
      </Routes>,
      { route: '/secret' },
    );
    await waitFor(() => expect(screen.getByTestId('login-stub')).toBeInTheDocument());
  });
});
```

- [ ] **Step 6.5: Run — fails**

Run: `pnpm --filter web test RequireAuth`
Expected: FAIL.

- [ ] **Step 6.6: Implement `RequireAuth.tsx`**

```tsx
// apps/web/src/app/RequireAuth.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../shared/auth/useAuth.js';
import { FullPageSpinner } from '../shared/ui/FullPageSpinner.js';

export function RequireAuth(): JSX.Element {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'unauthenticated')
    return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
```

- [ ] **Step 6.7: Run — passes**

Run: `pnpm --filter web test RequireAuth`
Expected: PASS (2 tests).

- [ ] **Step 6.8: Write failing test for `RequirePermission`**

```tsx
// apps/web/src/app/RequirePermission.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Routes, Route } from 'react-router-dom';
import { server } from '../test/server.js';
import { renderWithProviders } from '../test/utils.js';
import { RequirePermission } from './RequirePermission.js';
import { Forbidden } from './Forbidden.js';
import { screen, waitFor } from '@testing-library/react';
import { employeeUser } from '../test/fixtures.js';

function Allowed() {
  return <div>allowed</div>;
}

describe('RequirePermission', () => {
  it('renders children when permitted', async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/x"
          element={
            <RequirePermission perm="audit:read">
              <Allowed />
            </RequirePermission>
          }
        />
      </Routes>,
      { route: '/x' },
    );
    await waitFor(() => expect(screen.getByText('allowed')).toBeInTheDocument());
  });

  it('renders Forbidden when not permitted', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ user: employeeUser })));
    renderWithProviders(
      <Routes>
        <Route
          path="/x"
          element={
            <RequirePermission perm="audit:read">
              <Allowed />
            </RequirePermission>
          }
        />
      </Routes>,
      { route: '/x' },
    );
    await waitFor(() => expect(screen.getByTestId('forbidden-page')).toBeInTheDocument());
  });
});
```

- [ ] **Step 6.9: Run — fails**

Run: `pnpm --filter web test RequirePermission`
Expected: FAIL.

- [ ] **Step 6.10: Implement `RequirePermission.tsx`**

```tsx
// apps/web/src/app/RequirePermission.tsx
import type { ReactNode } from 'react';
import type { Permission } from '@naratala/shared';
import { useAuth } from '../shared/auth/useAuth.js';
import { usePermission } from '../shared/permissions/usePermission.js';
import { FullPageSpinner } from '../shared/ui/FullPageSpinner.js';
import { Forbidden } from './Forbidden.js';

export function RequirePermission({
  perm,
  children,
}: {
  perm: Permission;
  children: ReactNode;
}): JSX.Element {
  const { status } = useAuth();
  const ok = usePermission(perm);
  if (status === 'loading') return <FullPageSpinner />;
  if (!ok) return <Forbidden />;
  return <>{children}</>;
}
```

- [ ] **Step 6.11: Run — passes**

Run: `pnpm --filter web test RequirePermission`
Expected: PASS (2 tests).

- [ ] **Step 6.12: Wire `routes.tsx` (skeleton)**

```tsx
// apps/web/src/app/routes.tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './RequireAuth.js';
import { RequirePermission } from './RequirePermission.js';
import { NotFound } from './NotFound.js';

function Placeholder({ name }: { name: string }) {
  return <div data-testid={`page-${name}`}>{name}</div>;
}

export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<Placeholder name="login" />} />
      <Route path="/login/mfa" element={<Placeholder name="mfa" />} />
      <Route path="/password/forgot" element={<Placeholder name="forgot" />} />
      <Route path="/password/reset" element={<Placeholder name="reset" />} />
      <Route path="/invite/accept" element={<Placeholder name="invite" />} />
      <Route element={<RequireAuth />}>
        <Route index element={<Navigate to="/employees" replace />} />
        <Route path="/employees" element={<Placeholder name="employees" />} />
        <Route path="/employees/:id" element={<Placeholder name="employees" />} />
        <Route path="/departments" element={<Placeholder name="departments" />} />
        <Route
          path="/users"
          element={
            <RequirePermission perm="users:read">
              <Placeholder name="users" />
            </RequirePermission>
          }
        />
        <Route
          path="/audit"
          element={
            <RequirePermission perm="audit:read">
              <Placeholder name="audit" />
            </RequirePermission>
          }
        />
        <Route path="/settings/profile" element={<Placeholder name="profile" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 6.13: Update `App.tsx` to mount providers + routes**

```tsx
// apps/web/src/app/App.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { AuthProvider } from '../shared/auth/AuthProvider.js';
import { makeQueryClient } from '../shared/api/queries.js';
import { AppRoutes } from './routes.js';

export function App(): JSX.Element {
  const [client] = useState(() => makeQueryClient());
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster richColors closeButton />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 6.14: Run all tests + typecheck**

Run: `pnpm --filter web test && pnpm --filter web typecheck`
Expected: all green.

- [ ] **Step 6.15: Commit**

```bash
git add apps/web/src/app/ apps/web/src/shared/permissions/ apps/web/src/shared/ui/FullPageSpinner.tsx
git commit -m "feat(web): routing skeleton + RequireAuth + RequirePermission"
```

---

## Task 7: Shell / Sidebar / TopBar (typed TSX port)

**Files:**
- Create: `apps/web/src/shared/ui/Avatar.tsx`
- Create: `apps/web/src/shared/ui/Pill.tsx`
- Create: `apps/web/src/shared/ui/Card.tsx`
- Create: `apps/web/src/shared/ui/Sidebar.tsx`
- Create: `apps/web/src/shared/ui/TopBar.tsx`
- Create: `apps/web/src/shared/ui/Shell.tsx`
- Create: `apps/web/src/shared/ui/Sidebar.test.tsx`
- Modify: `apps/web/src/app/routes.tsx` (wrap protected routes in `<Shell/>`)

- [ ] **Step 7.1: Create `Avatar.tsx`**

```tsx
// apps/web/src/shared/ui/Avatar.tsx
export function Avatar({ name, hue, size = 36 }: { name: string; hue: number; size?: number }): JSX.Element {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
  return (
    <div
      className="nt-avatar"
      style={{ '--h': hue, width: size, height: size, fontSize: size * 0.38 } as React.CSSProperties}
    >
      {initials || '?'}
    </div>
  );
}
```

- [ ] **Step 7.2: Create `Pill.tsx`**

```tsx
// apps/web/src/shared/ui/Pill.tsx
import type { ReactNode } from 'react';

export type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info';

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }): JSX.Element {
  return <span className={`nt-pill tone-${tone}`}>{children}</span>;
}
```

- [ ] **Step 7.3: Create `Card.tsx`**

```tsx
// apps/web/src/shared/ui/Card.tsx
import type { ReactNode } from 'react';

export function Card({
  title,
  subtitle,
  actions,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="nt-card">
      {(title || actions) && (
        <header className="nt-card-head">
          <div>
            {title && <h2 className="nt-card-title">{title}</h2>}
            {subtitle && <p className="nt-card-sub">{subtitle}</p>}
          </div>
          {actions && <div className="nt-card-actions">{actions}</div>}
        </header>
      )}
      <div className="nt-card-body">{children}</div>
    </section>
  );
}
```

- [ ] **Step 7.4: Write failing test for Sidebar visibility**

```tsx
// apps/web/src/shared/ui/Sidebar.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { Sidebar } from './Sidebar.js';
import { adminUser, employeeUser, hrUser } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';

describe('Sidebar', () => {
  it('admin sees all items', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ user: adminUser })));
    renderWithProviders(<Sidebar />);
    await waitFor(() => expect(screen.getByRole('link', { name: /employees/i })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /departments/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /audit/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
  });

  it('employee sees only employees + departments + profile', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ user: employeeUser })));
    renderWithProviders(<Sidebar />);
    await waitFor(() => expect(screen.getByRole('link', { name: /employees/i })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /departments/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /audit/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
  });

  it('hr sees employees + departments + audit + profile (no users)', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ user: hrUser })));
    renderWithProviders(<Sidebar />);
    await waitFor(() => expect(screen.getByRole('link', { name: /employees/i })).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /audit/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 7.5: Run — fails**

Run: `pnpm --filter web test Sidebar`
Expected: FAIL.

- [ ] **Step 7.6: Implement `Sidebar.tsx`**

```tsx
// apps/web/src/shared/ui/Sidebar.tsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';
import { hasPermission, type Permission } from '@naratala/shared';

interface Item {
  to: string;
  label: string;
  perm?: Permission;
}

const ITEMS: Item[] = [
  { to: '/employees', label: 'Employees', perm: 'employees:read:any' },
  { to: '/departments', label: 'Departments' },
  { to: '/users', label: 'Users', perm: 'users:read' },
  { to: '/audit', label: 'Audit', perm: 'audit:read' },
  { to: '/settings/profile', label: 'Profile' },
];

export function Sidebar(): JSX.Element {
  const { user } = useAuth();
  const visible = ITEMS.filter((it) => !it.perm || (user && hasPermission(user.role, it.perm)));
  return (
    <aside className="nt-sidebar">
      <div className="nt-brand">
        <div className="nt-brand-text">
          <div className="nt-brand-name">Naratala</div>
          <div className="nt-brand-sub">People Studio</div>
        </div>
      </div>
      <nav className="nt-nav" aria-label="primary">
        {visible.map((it) => (
          <NavLink key={it.to} to={it.to} className="nt-nav-item">
            <span className="nt-nav-label">{it.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 7.7: Run — passes**

Run: `pnpm --filter web test Sidebar`
Expected: PASS (3 tests).

- [ ] **Step 7.8: Implement `TopBar.tsx`**

```tsx
// apps/web/src/shared/ui/TopBar.tsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';

export function TopBar({ title }: { title: string }): JSX.Element {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="nt-topbar">
      <h1 className="nt-page-title">{title}</h1>
      <div className="nt-topbar-right">
        <span className="nt-me-name">{user?.email ?? ''}</span>
        <button
          type="button"
          className="nt-icon-btn"
          onClick={async () => {
            await signOut();
            navigate('/login', { replace: true });
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 7.9: Implement `Shell.tsx`**

```tsx
// apps/web/src/shared/ui/Shell.tsx
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { TopBar } from './TopBar.js';

const TITLES: Record<string, string> = {
  '/employees': 'Employees',
  '/departments': 'Departments',
  '/users': 'Users',
  '/audit': 'Audit',
  '/settings/profile': 'Profile',
};

export function Shell(): JSX.Element {
  const loc = useLocation();
  const key = Object.keys(TITLES).find((k) => loc.pathname.startsWith(k)) ?? '/employees';
  return (
    <div className="nt-shell">
      <Sidebar />
      <main className="nt-main">
        <TopBar title={TITLES[key] ?? ''} />
        <div className="nt-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 7.10: Wire `Shell` into routes**

In `apps/web/src/app/routes.tsx`, change:

```tsx
      <Route element={<RequireAuth />}>
```

to:

```tsx
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
```

…and add a closing `</Route>` before the existing closing `</Route>`. Add the import:

```tsx
import { Shell } from '../shared/ui/Shell.js';
```

- [ ] **Step 7.11: Run all tests + typecheck**

Run: `pnpm --filter web test && pnpm --filter web typecheck`
Expected: green.

- [ ] **Step 7.12: Commit**

```bash
git add apps/web/src/shared/ui/ apps/web/src/app/routes.tsx
git commit -m "feat(web): Shell + Sidebar (permission-gated) + TopBar"
```

---

## Task 8: i18n setup

**Files:**
- Create: `apps/web/src/shared/i18n/index.ts`
- Create: `apps/web/src/shared/i18n/locales/id.json`
- Create: `apps/web/src/shared/i18n/locales/en.json`
- Create: `apps/web/src/features/settings/LanguageSwitcher.tsx`
- Create: `apps/web/src/shared/i18n/i18n.test.tsx`
- Modify: `apps/web/src/main.tsx` (import i18n)

- [ ] **Step 8.1: Create locale bundles**

```json
// apps/web/src/shared/i18n/locales/en.json
{
  "nav": {
    "employees": "Employees",
    "departments": "Departments",
    "users": "Users",
    "audit": "Audit",
    "profile": "Profile",
    "signOut": "Sign out"
  },
  "auth": {
    "email": "Email",
    "password": "Password",
    "signIn": "Sign in",
    "forgotPassword": "Forgot password?",
    "mfaCode": "6-digit code",
    "verify": "Verify",
    "newPassword": "New password",
    "confirmPassword": "Confirm password",
    "resetSent": "If that email exists, we sent reset instructions.",
    "linkExpired": "This link has expired.",
    "tryAgain": "Request a new one"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "loading": "Loading…",
    "search": "Search",
    "yes": "Yes",
    "no": "No"
  }
}
```

```json
// apps/web/src/shared/i18n/locales/id.json
{
  "nav": {
    "employees": "Karyawan",
    "departments": "Departemen",
    "users": "Pengguna",
    "audit": "Audit",
    "profile": "Profil",
    "signOut": "Keluar"
  },
  "auth": {
    "email": "Email",
    "password": "Kata sandi",
    "signIn": "Masuk",
    "forgotPassword": "Lupa kata sandi?",
    "mfaCode": "Kode 6 digit",
    "verify": "Verifikasi",
    "newPassword": "Kata sandi baru",
    "confirmPassword": "Konfirmasi kata sandi",
    "resetSent": "Jika email tersebut ada, kami sudah mengirim instruksi.",
    "linkExpired": "Tautan ini sudah kedaluwarsa.",
    "tryAgain": "Minta yang baru"
  },
  "common": {
    "save": "Simpan",
    "cancel": "Batal",
    "delete": "Hapus",
    "edit": "Ubah",
    "create": "Buat",
    "loading": "Memuat…",
    "search": "Cari",
    "yes": "Ya",
    "no": "Tidak"
  }
}
```

- [ ] **Step 8.2: Create `i18n/index.ts`**

```ts
// apps/web/src/shared/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import id from './locales/id.json';

export const i18nReady = i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, id: { translation: id } },
  lng: 'id',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
```

- [ ] **Step 8.3: Write failing test**

```tsx
// apps/web/src/shared/i18n/i18n.test.tsx
import { describe, it, expect, beforeAll } from 'vitest';
import { useTranslation } from 'react-i18next';
import { render, screen } from '@testing-library/react';
import { i18nReady } from './index.js';

function Probe() {
  const { t, i18n } = useTranslation();
  return (
    <div>
      <div data-testid="lang">{i18n.language}</div>
      <div data-testid="text">{t('nav.employees')}</div>
    </div>
  );
}

describe('i18n', () => {
  beforeAll(async () => {
    await i18nReady;
  });

  it('defaults to id and translates nav.employees → Karyawan', () => {
    render(<Probe />);
    expect(screen.getByTestId('lang').textContent).toBe('id');
    expect(screen.getByTestId('text').textContent).toBe('Karyawan');
  });
});
```

- [ ] **Step 8.4: Run — passes**

Run: `pnpm --filter web test i18n`
Expected: PASS.

- [ ] **Step 8.5: Implement `LanguageSwitcher`**

```tsx
// apps/web/src/features/settings/LanguageSwitcher.tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../../shared/api/client.js';
import { useAuth } from '../../shared/auth/useAuth.js';
import { qk } from '../../shared/api/queries.js';

export function LanguageSwitcher(): JSX.Element {
  const { i18n } = useTranslation();
  const { user, refreshMe } = useAuth();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (lang: 'id' | 'en') =>
      apiFetch(`/api/users/${user!.id}`, { method: 'PATCH', body: { language: lang } }),
    onSuccess: async (_d, lang) => {
      await i18n.changeLanguage(lang);
      await refreshMe();
      qc.invalidateQueries({ queryKey: qk.me() });
    },
  });
  return (
    <select
      aria-label="language"
      value={i18n.language}
      onChange={(e) => m.mutate(e.target.value as 'id' | 'en')}
      disabled={!user || m.isPending}
    >
      <option value="id">Bahasa Indonesia</option>
      <option value="en">English</option>
    </select>
  );
}
```

- [ ] **Step 8.6: Wire i18n into `main.tsx`**

```tsx
// apps/web/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './shared/i18n/index.js';
import { App } from './app/App.js';

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 8.7: Commit**

```bash
git add apps/web/src/shared/i18n/ apps/web/src/features/settings/LanguageSwitcher.tsx apps/web/src/main.tsx
git commit -m "feat(web): i18next ID/EN bundles + LanguageSwitcher"
```

---

## Task 9: LoginPage + MfaChallengePage

**Files:**
- Create: `apps/web/src/features/auth/LoginPage.tsx`
- Create: `apps/web/src/features/auth/MfaChallengePage.tsx`
- Create: `apps/web/src/features/auth/LoginPage.test.tsx`
- Create: `apps/web/src/features/auth/MfaChallengePage.test.tsx`
- Modify: `apps/web/src/app/routes.tsx` (replace placeholders)

- [ ] **Step 9.1: Write failing test for LoginPage**

```tsx
// apps/web/src/features/auth/LoginPage.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { LoginPage } from './LoginPage.js';
import { adminUser } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

function Landed() {
  return <div data-testid="landed">on /employees</div>;
}

describe('LoginPage', () => {
  it('happy path: posts /login then navigates to /employees', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ accessToken: 'a-tok', user: adminUser }),
      ),
    );
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/employees" element={<Landed />} />
      </Routes>,
      { route: '/login' },
    );
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@naratala.local');
    await userEvent.type(screen.getByLabelText(/password/i), 'correct-horse-12');
    await userEvent.click(screen.getByRole('button', { name: /sign in|masuk/i }));
    await waitFor(() => expect(screen.getByTestId('landed')).toBeInTheDocument());
  });

  it('mfa path: navigates to /login/mfa with mfaToken in router state', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ mfaRequired: true, mfaToken: 'mfa-tok' }),
      ),
    );
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/mfa" element={<div data-testid="mfa-page">mfa</div>} />
      </Routes>,
      { route: '/login' },
    );
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@naratala.local');
    await userEvent.type(screen.getByLabelText(/password/i), 'correct-horse-12');
    await userEvent.click(screen.getByRole('button', { name: /sign in|masuk/i }));
    await waitFor(() => expect(screen.getByTestId('mfa-page')).toBeInTheDocument());
  });

  it('invalid credentials → toast appears', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ code: 'INVALID_CREDENTIALS', message: 'invalid' }, { status: 401 }),
      ),
    );
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login' },
    );
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@naratala.local');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: /sign in|masuk/i }));
    await waitFor(() => expect(screen.getByText(/invalid/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 9.2: Run — fails**

Run: `pnpm --filter web test LoginPage`
Expected: FAIL.

- [ ] **Step 9.3: Implement `LoginPage.tsx`**

```tsx
// apps/web/src/features/auth/LoginPage.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { LoginBody, type UserDTO } from '@naratala/shared';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiFetch } from '../../shared/api/client.js';
import { ApiError } from '../../shared/api/ApiError.js';
import { useAuth } from '../../shared/auth/useAuth.js';

type LoginInput = { email: string; password: string };
type LoginResp =
  | { mfaRequired: true; mfaToken: string }
  | { accessToken: string; user: UserDTO };

export function LoginPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuth();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/employees';

  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(LoginBody),
    defaultValues: { email: '', password: '' },
  });

  const m = useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch<LoginResp>('/api/auth/login', { method: 'POST', body: input }),
    onSuccess: (data) => {
      if ('mfaRequired' in data) {
        navigate('/login/mfa', { state: { mfaToken: data.mfaToken, from } });
        return;
      }
      setAuth({ user: data.user, accessToken: data.accessToken });
      navigate(from, { replace: true });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Sign-in failed');
    },
  });

  return (
    <main className="nt-auth-page">
      <form onSubmit={handleSubmit((v) => m.mutate(v))} className="nt-auth-form">
        <h1>Naratala</h1>
        <label>
          {t('auth.email')}
          <input type="email" autoComplete="email" {...register('email')} />
        </label>
        {formState.errors.email && <p role="alert">{formState.errors.email.message}</p>}
        <label>
          {t('auth.password')}
          <input type="password" autoComplete="current-password" {...register('password')} />
        </label>
        {formState.errors.password && <p role="alert">{formState.errors.password.message}</p>}
        <button type="submit" disabled={m.isPending}>
          {t('auth.signIn')}
        </button>
        <Link to="/password/forgot">{t('auth.forgotPassword')}</Link>
      </form>
    </main>
  );
}
```

- [ ] **Step 9.4: Run — passes**

Run: `pnpm --filter web test LoginPage`
Expected: PASS (3 tests).

- [ ] **Step 9.5: Write failing test for MfaChallengePage**

```tsx
// apps/web/src/features/auth/MfaChallengePage.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { MfaChallengePage } from './MfaChallengePage.js';
import { adminUser } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

function Landed() {
  return <div data-testid="landed">on /employees</div>;
}

describe('MfaChallengePage', () => {
  it('submits with bearer mfa token; on success navigates', async () => {
    let seenAuth: string | null = null;
    server.use(
      http.post('/api/auth/mfa/verify', ({ request }) => {
        seenAuth = request.headers.get('authorization');
        return HttpResponse.json({ accessToken: 'final', user: adminUser });
      }),
    );
    renderWithProviders(
      <Routes>
        <Route path="/login/mfa" element={<MfaChallengePage />} />
        <Route path="/employees" element={<Landed />} />
      </Routes>,
      { route: '/login/mfa' },
    );
    await userEvent.type(screen.getByLabelText(/code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify|verifikasi/i }));
    await waitFor(() => expect(screen.getByTestId('landed')).toBeInTheDocument());
    expect(seenAuth).toMatch(/^Bearer /);
  });

  it('invalid code → inline error', async () => {
    server.use(
      http.post('/api/auth/mfa/verify', () =>
        HttpResponse.json({ code: 'MFA_INVALID', message: 'bad code' }, { status: 401 }),
      ),
    );
    renderWithProviders(<MfaChallengePage />, { route: '/login/mfa' });
    await userEvent.type(screen.getByLabelText(/code/i), '111111');
    await userEvent.click(screen.getByRole('button', { name: /verify|verifikasi/i }));
    await waitFor(() => expect(screen.getByText(/bad code/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 9.6: Run — fails**

Run: `pnpm --filter web test MfaChallengePage`
Expected: FAIL.

- [ ] **Step 9.7: Implement `MfaChallengePage.tsx`**

```tsx
// apps/web/src/features/auth/MfaChallengePage.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { MfaVerifyBody, type UserDTO } from '@naratala/shared';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../shared/auth/useAuth.js';
import { ApiError } from '../../shared/api/ApiError.js';

type MfaInput = { code: string };
type Resp = { accessToken: string; user: UserDTO };

export function MfaChallengePage(): JSX.Element {
  const { t } = useTranslation();
  const nav = useNavigate();
  const loc = useLocation();
  const { setAuth } = useAuth();
  const state = (loc.state as { mfaToken?: string; from?: string } | null) ?? {};
  const from = state.from ?? '/employees';
  const mfaToken = state.mfaToken ?? '';
  const [serverErr, setServerErr] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<MfaInput>({
    resolver: zodResolver(MfaVerifyBody),
    defaultValues: { code: '' },
  });

  const m = useMutation({
    mutationFn: async (input: MfaInput) => {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mfaToken}` },
        body: JSON.stringify(input),
      });
      const body = (await res.json().catch(() => null)) as
        | (Resp & { code?: never })
        | { code: string; message: string }
        | null;
      if (!res.ok || !body || 'code' in body) {
        const e = body as { code: string; message: string } | null;
        throw new ApiError(e?.code ?? 'MFA_INVALID', e?.message ?? 'invalid', res.status);
      }
      return body;
    },
    onSuccess: (d) => {
      setAuth({ user: d.user, accessToken: d.accessToken });
      nav(from, { replace: true });
    },
    onError: (e) => setServerErr(e instanceof ApiError ? e.message : 'verify failed'),
  });

  return (
    <main className="nt-auth-page">
      <form onSubmit={handleSubmit((v) => m.mutate(v))} className="nt-auth-form">
        <label>
          {t('auth.mfaCode')}
          <input inputMode="numeric" autoComplete="one-time-code" {...register('code')} />
        </label>
        {formState.errors.code && <p role="alert">{formState.errors.code.message}</p>}
        {serverErr && <p role="alert">{serverErr}</p>}
        <button type="submit" disabled={m.isPending}>
          {t('auth.verify')}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 9.8: Run — passes**

Run: `pnpm --filter web test MfaChallengePage`
Expected: PASS (2 tests).

- [ ] **Step 9.9: Wire pages into `routes.tsx`**

Replace `<Placeholder name="login" />` with `<LoginPage />` and `<Placeholder name="mfa" />` with `<MfaChallengePage />`. Add imports:

```tsx
import { LoginPage } from '../features/auth/LoginPage.js';
import { MfaChallengePage } from '../features/auth/MfaChallengePage.js';
```

- [ ] **Step 9.10: Commit**

```bash
git add apps/web/src/features/auth/LoginPage.tsx apps/web/src/features/auth/MfaChallengePage.tsx apps/web/src/features/auth/LoginPage.test.tsx apps/web/src/features/auth/MfaChallengePage.test.tsx apps/web/src/app/routes.tsx
git commit -m "feat(web): LoginPage + MfaChallengePage"
```

---

## Task 10: Forgot/Reset/Invite + PasswordStrengthMeter

**Files:**
- Create: `apps/web/src/features/auth/PasswordStrengthMeter.tsx`
- Create: `apps/web/src/features/auth/ForgotPasswordPage.tsx`
- Create: `apps/web/src/features/auth/ResetPasswordPage.tsx`
- Create: `apps/web/src/features/auth/AcceptInvitePage.tsx`
- Create: `apps/web/src/features/auth/ResetPasswordPage.test.tsx`
- Create: `apps/web/src/features/auth/AcceptInvitePage.test.tsx`
- Modify: `apps/web/src/app/routes.tsx`

- [ ] **Step 10.1: Implement `PasswordStrengthMeter.tsx`**

```tsx
// apps/web/src/features/auth/PasswordStrengthMeter.tsx
export function passwordScore(p: string): 0 | 1 | 2 | 3 | 4 {
  let s = 0;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4) as 0 | 1 | 2 | 3 | 4;
}

export function PasswordStrengthMeter({ password }: { password: string }): JSX.Element {
  const s = passwordScore(password);
  return (
    <div className="nt-pw-meter" aria-label="password strength" data-score={s}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} data-active={i < s} />
      ))}
    </div>
  );
}
```

- [ ] **Step 10.2: Implement `ForgotPasswordPage.tsx`** (no test needed beyond what's covered by client tests; trivial form)

```tsx
// apps/web/src/features/auth/ForgotPasswordPage.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { PasswordForgotBody } from '@naratala/shared';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { apiFetch } from '../../shared/api/client.js';

export function ForgotPasswordPage(): JSX.Element {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(PasswordForgotBody),
    defaultValues: { email: '' },
  });
  const m = useMutation({
    mutationFn: (v: { email: string }) =>
      apiFetch('/api/auth/password/forgot', { method: 'POST', body: v }),
    onSettled: () => setSent(true),
  });
  if (sent) return <main className="nt-auth-page">{t('auth.resetSent')}</main>;
  return (
    <main className="nt-auth-page">
      <form onSubmit={handleSubmit((v) => m.mutate(v))} className="nt-auth-form">
        <label>
          {t('auth.email')}
          <input type="email" {...register('email')} />
        </label>
        {formState.errors.email && <p role="alert">{formState.errors.email.message}</p>}
        <button type="submit" disabled={m.isPending}>
          {t('common.save')}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 10.3: Write failing test for ResetPasswordPage**

```tsx
// apps/web/src/features/auth/ResetPasswordPage.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { ResetPasswordPage } from './ResetPasswordPage.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ResetPasswordPage', () => {
  it('410 expired token → shows expired message', async () => {
    server.use(
      http.post('/api/auth/password/reset', () =>
        HttpResponse.json({ code: 'INVITE_EXPIRED', message: 'expired' }, { status: 410 }),
      ),
    );
    renderWithProviders(
      <Routes>
        <Route path="/password/reset" element={<ResetPasswordPage />} />
      </Routes>,
      { route: '/password/reset?token=abcdefghij' },
    );
    await userEvent.type(screen.getByLabelText(/new password/i), 'correct-horse-99');
    await userEvent.type(screen.getByLabelText(/confirm/i), 'correct-horse-99');
    await userEvent.click(screen.getByRole('button', { name: /save|simpan/i }));
    await waitFor(() => expect(screen.getByText(/expired/i)).toBeInTheDocument());
  });

  it('happy path → navigates to /login', async () => {
    server.use(http.post('/api/auth/password/reset', () => HttpResponse.json({ ok: true })));
    renderWithProviders(
      <Routes>
        <Route path="/password/reset" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div data-testid="login">login</div>} />
      </Routes>,
      { route: '/password/reset?token=abcdefghij' },
    );
    await userEvent.type(screen.getByLabelText(/new password/i), 'correct-horse-99');
    await userEvent.type(screen.getByLabelText(/confirm/i), 'correct-horse-99');
    await userEvent.click(screen.getByRole('button', { name: /save|simpan/i }));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
  });
});
```

- [ ] **Step 10.4: Implement `ResetPasswordPage.tsx`**

```tsx
// apps/web/src/features/auth/ResetPasswordPage.tsx
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiFetch } from '../../shared/api/client.js';
import { ApiError } from '../../shared/api/ApiError.js';
import { PasswordStrengthMeter } from './PasswordStrengthMeter.js';

type Input = { password: string; confirm: string };

export function ResetPasswordPage(): JSX.Element {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [expired, setExpired] = useState(false);
  const { register, handleSubmit, watch, setError, formState } = useForm<Input>({
    defaultValues: { password: '', confirm: '' },
  });

  const m = useMutation({
    mutationFn: (v: Input) =>
      apiFetch('/api/auth/password/reset', {
        method: 'POST',
        body: { token, newPassword: v.password },
      }),
    onSuccess: () => {
      toast.success('Password updated');
      navigate('/login', { replace: true });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 410) {
        setExpired(true);
        return;
      }
      if (e instanceof ApiError && e.fields?.['newPassword']) {
        setError('password', { message: e.fields['newPassword'][0] });
        return;
      }
      toast.error(e instanceof ApiError ? e.message : 'Reset failed');
    },
  });

  if (expired) {
    return (
      <main className="nt-auth-page">
        <p>{t('auth.linkExpired')}</p>
        <Link to="/password/forgot">{t('auth.tryAgain')}</Link>
      </main>
    );
  }

  return (
    <main className="nt-auth-page">
      <form
        onSubmit={handleSubmit((v) => {
          if (v.password !== v.confirm) {
            setError('confirm', { message: 'must match' });
            return;
          }
          m.mutate(v);
        })}
        className="nt-auth-form"
      >
        <label>
          {t('auth.newPassword')}
          <input type="password" {...register('password', { minLength: 10 })} />
        </label>
        <PasswordStrengthMeter password={watch('password')} />
        {formState.errors.password && <p role="alert">{formState.errors.password.message}</p>}
        <label>
          {t('auth.confirmPassword')}
          <input type="password" {...register('confirm')} />
        </label>
        {formState.errors.confirm && <p role="alert">{formState.errors.confirm.message}</p>}
        <button type="submit" disabled={m.isPending}>
          {t('common.save')}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 10.5: Run — passes**

Run: `pnpm --filter web test ResetPasswordPage`
Expected: PASS (2 tests).

- [ ] **Step 10.6: Write failing test for AcceptInvitePage**

```tsx
// apps/web/src/features/auth/AcceptInvitePage.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { AcceptInvitePage } from './AcceptInvitePage.js';
import { adminUser } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('AcceptInvitePage', () => {
  it('renders invite info and accepts invite → navigates to /employees', async () => {
    server.use(
      http.get('/api/invites/:token', () =>
        HttpResponse.json({
          email: 'new@naratala.local',
          fullName: 'New Hire',
          expiresAt: '2026-12-31T00:00:00.000Z',
        }),
      ),
      http.post('/api/invites/:token/accept', () =>
        HttpResponse.json({ accessToken: 'a-tok', user: adminUser }),
      ),
    );
    renderWithProviders(
      <Routes>
        <Route path="/invite/accept" element={<AcceptInvitePage />} />
        <Route path="/employees" element={<div data-testid="emp">emp</div>} />
      </Routes>,
      { route: '/invite/accept?token=tok-1234567' },
    );
    await waitFor(() => expect(screen.getByText(/new hire/i)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/new password/i), 'correct-horse-99');
    await userEvent.type(screen.getByLabelText(/confirm/i), 'correct-horse-99');
    await userEvent.click(screen.getByRole('button', { name: /save|simpan/i }));
    await waitFor(() => expect(screen.getByTestId('emp')).toBeInTheDocument());
  });

  it('410 → shows expired empty state', async () => {
    server.use(
      http.get('/api/invites/:token', () =>
        HttpResponse.json({ code: 'INVITE_EXPIRED', message: 'gone' }, { status: 410 }),
      ),
    );
    renderWithProviders(
      <Routes>
        <Route path="/invite/accept" element={<AcceptInvitePage />} />
      </Routes>,
      { route: '/invite/accept?token=tok-1234567' },
    );
    await waitFor(() => expect(screen.getByText(/expired/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 10.7: Implement `AcceptInvitePage.tsx`**

```tsx
// apps/web/src/features/auth/AcceptInvitePage.tsx
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { InviteInfoDTO, UserDTO } from '@naratala/shared';
import { apiFetch } from '../../shared/api/client.js';
import { ApiError } from '../../shared/api/ApiError.js';
import { useAuth } from '../../shared/auth/useAuth.js';
import { PasswordStrengthMeter } from './PasswordStrengthMeter.js';

type Input = { password: string; confirm: string };

export function AcceptInvitePage(): JSX.Element {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const nav = useNavigate();
  const { setAuth } = useAuth();

  const info = useQuery({
    queryKey: ['invite', token],
    queryFn: () => apiFetch<InviteInfoDTO>(`/api/invites/${token}`),
    retry: false,
  });

  const { register, handleSubmit, watch, setError, formState } = useForm<Input>({
    defaultValues: { password: '', confirm: '' },
  });

  const accept = useMutation({
    mutationFn: (v: Input) =>
      apiFetch<{ accessToken: string; user: UserDTO }>(`/api/invites/${token}/accept`, {
        method: 'POST',
        body: { password: v.password },
      }),
    onSuccess: (d) => {
      setAuth({ user: d.user, accessToken: d.accessToken });
      nav('/employees', { replace: true });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.fields?.['password']) {
        setError('password', { message: e.fields['password'][0] });
        return;
      }
      toast.error(e instanceof ApiError ? e.message : 'Accept failed');
    },
  });

  if (info.isLoading) return <main>{t('common.loading')}</main>;
  if (info.error) {
    const e = info.error as ApiError;
    if (e.status === 410) return <main>This invite has expired or already been used.</main>;
    return <main role="alert">{e.message}</main>;
  }

  return (
    <main className="nt-auth-page">
      <h1>Welcome, {info.data!.fullName}</h1>
      <p>{info.data!.email}</p>
      <form
        onSubmit={handleSubmit((v) => {
          if (v.password !== v.confirm) {
            setError('confirm', { message: 'must match' });
            return;
          }
          accept.mutate(v);
        })}
        className="nt-auth-form"
      >
        <label>
          {t('auth.newPassword')}
          <input type="password" {...register('password')} />
        </label>
        <PasswordStrengthMeter password={watch('password')} />
        {formState.errors.password && <p role="alert">{formState.errors.password.message}</p>}
        <label>
          {t('auth.confirmPassword')}
          <input type="password" {...register('confirm')} />
        </label>
        {formState.errors.confirm && <p role="alert">{formState.errors.confirm.message}</p>}
        <button type="submit" disabled={accept.isPending}>
          {t('common.save')}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 10.8: Run — passes**

Run: `pnpm --filter web test AcceptInvitePage`
Expected: PASS (2 tests).

- [ ] **Step 10.9: Wire all auth pages into `routes.tsx`** — replace placeholders with components, add imports.

- [ ] **Step 10.10: Commit**

```bash
git add apps/web/src/features/auth/ apps/web/src/app/routes.tsx
git commit -m "feat(web): forgot/reset/invite pages + password strength meter"
```

---

## Task 11: Departments feature (smallest CRUD)

**Files:**
- Create: `apps/web/src/features/departments/hooks.ts`
- Create: `apps/web/src/features/departments/DepartmentsPage.tsx`
- Create: `apps/web/src/features/departments/DepartmentRow.tsx`
- Create: `apps/web/src/features/departments/DepartmentsPage.test.tsx`
- Modify: `apps/web/src/app/routes.tsx`

- [ ] **Step 11.1: Create `hooks.ts`**

```ts
// apps/web/src/features/departments/hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DepartmentDTO } from '@naratala/shared';
import { apiFetch } from '../../shared/api/client.js';
import { qk } from '../../shared/api/queries.js';

export function useDepartmentsQuery() {
  return useQuery({
    queryKey: qk.departments.all(),
    queryFn: () => apiFetch<{ data: DepartmentDTO[] }>('/api/departments'),
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<DepartmentDTO>('/api/departments', { method: 'POST', body: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.departments.all() }),
  });
}

export function useRenameDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; name: string }) =>
      apiFetch(`/api/departments/${v.id}`, { method: 'PATCH', body: { name: v.name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.departments.all() }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/departments/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.departments.all() }),
  });
}
```

- [ ] **Step 11.2: Write failing test for DepartmentsPage**

```tsx
// apps/web/src/features/departments/DepartmentsPage.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { DepartmentsPage } from './DepartmentsPage.js';
import { dept } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('DepartmentsPage', () => {
  it('lists departments', async () => {
    renderWithProviders(<DepartmentsPage />);
    await waitFor(() => expect(screen.getByText(dept.name)).toBeInTheDocument());
  });

  it('creates a new department', async () => {
    let stored = [dept];
    server.use(
      http.get('/api/departments', () => HttpResponse.json({ data: stored })),
      http.post('/api/departments', async ({ request }) => {
        const body = (await request.json()) as { name: string };
        const newDept = { ...dept, id: 99, name: body.name };
        stored = [...stored, newDept];
        return HttpResponse.json(newDept, { status: 201 });
      }),
    );
    renderWithProviders(<DepartmentsPage />);
    await waitFor(() => expect(screen.getByText(dept.name)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /new department|buat/i }));
    await userEvent.type(screen.getByLabelText(/name/i), 'Finance');
    await userEvent.click(screen.getByRole('button', { name: /^create$|^buat$|^save$/i }));
    await waitFor(() => expect(screen.getByText('Finance')).toBeInTheDocument());
  });

  it('delete-with-employees → toast with code', async () => {
    server.use(
      http.delete('/api/departments/:id', () =>
        HttpResponse.json(
          { code: 'DEPT_HAS_EMPLOYEES', message: 'Move employees first' },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<DepartmentsPage />);
    await waitFor(() => expect(screen.getByText(dept.name)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /delete|hapus/i }));
    await userEvent.click(screen.getByRole('button', { name: /^yes$|^ya$|confirm/i }));
    await waitFor(() => expect(screen.getByText(/move employees first/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 11.3: Run — fails**

Run: `pnpm --filter web test DepartmentsPage`
Expected: FAIL.

- [ ] **Step 11.4: Implement `DepartmentRow.tsx`**

```tsx
// apps/web/src/features/departments/DepartmentRow.tsx
import { useState } from 'react';
import type { DepartmentDTO } from '@naratala/shared';
import { useDeleteDepartment, useRenameDepartment } from './hooks.js';
import { usePermission } from '../../shared/permissions/usePermission.js';
import { toast } from 'sonner';
import { ApiError } from '../../shared/api/ApiError.js';

export function DepartmentRow({ d }: { d: DepartmentDTO }): JSX.Element {
  const canManage = usePermission('departments:manage');
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(d.name);
  const rename = useRenameDepartment();
  const del = useDeleteDepartment();
  return (
    <tr>
      <td>
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (name !== d.name) rename.mutate({ id: d.id, name });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setName(d.name);
                setEditing(false);
              }
            }}
            aria-label={`rename ${d.name}`}
            autoFocus
          />
        ) : (
          <button type="button" onClick={() => canManage && setEditing(true)} className="nt-link">
            {d.name}
          </button>
        )}
      </td>
      <td>{new Date(d.createdAt).toLocaleDateString()}</td>
      <td>
        {canManage && !confirming && (
          <button type="button" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
        {canManage && confirming && (
          <>
            <button
              type="button"
              onClick={() =>
                del.mutate(d.id, {
                  onSuccess: () => setConfirming(false),
                  onError: (e) => {
                    setConfirming(false);
                    toast.error(e instanceof ApiError ? e.message : 'Delete failed');
                  },
                })
              }
            >
              Yes
            </button>
            <button type="button" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
```

- [ ] **Step 11.5: Implement `DepartmentsPage.tsx`**

```tsx
// apps/web/src/features/departments/DepartmentsPage.tsx
import { useState } from 'react';
import { useDepartmentsQuery, useCreateDepartment } from './hooks.js';
import { DepartmentRow } from './DepartmentRow.js';
import { Card } from '../../shared/ui/Card.js';
import { usePermission } from '../../shared/permissions/usePermission.js';

export function DepartmentsPage(): JSX.Element {
  const q = useDepartmentsQuery();
  const create = useCreateDepartment();
  const canManage = usePermission('departments:manage');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  return (
    <Card
      title="Departments"
      actions={
        canManage && !creating ? (
          <button type="button" onClick={() => setCreating(true)}>
            New department
          </button>
        ) : null
      }
    >
      {creating && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(name, {
              onSuccess: () => {
                setCreating(false);
                setName('');
              },
            });
          }}
        >
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <button type="submit">Create</button>
          <button type="button" onClick={() => setCreating(false)}>
            Cancel
          </button>
        </form>
      )}
      {q.isLoading && <p>Loading…</p>}
      {q.data && (
        <table className="nt-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {q.data.data.map((d) => (
              <DepartmentRow key={d.id} d={d} />
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
```

- [ ] **Step 11.6: Run — passes**

Run: `pnpm --filter web test DepartmentsPage`
Expected: PASS (3 tests).

- [ ] **Step 11.7: Wire route, commit**

In `routes.tsx` swap `<Placeholder name="departments" />` for `<DepartmentsPage />` and add the import.

```bash
git add apps/web/src/features/departments/ apps/web/src/app/routes.tsx
git commit -m "feat(web): departments page (list, create, rename, delete)"
```

---

## Task 12: Employees feature (page, filters, table, drawer, form)

**Files:**
- Create: `apps/web/src/features/employees/hooks.ts`
- Create: `apps/web/src/features/employees/EmployeeFilters.tsx`
- Create: `apps/web/src/features/employees/EmployeeTable.tsx`
- Create: `apps/web/src/features/employees/EmployeeDrawer.tsx`
- Create: `apps/web/src/features/employees/EmployeeForm.tsx`
- Create: `apps/web/src/features/employees/EmployeesPage.tsx`
- Create: `apps/web/src/features/employees/EmployeesPage.test.tsx`
- Create: `apps/web/src/features/employees/EmployeeForm.test.tsx`
- Modify: `apps/web/src/app/routes.tsx`

- [ ] **Step 12.1: Create `hooks.ts`**

```ts
// apps/web/src/features/employees/hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmployeeDTO, EmployeeUpdate } from '@naratala/shared';
import { z } from '@naratala/shared';
import { apiFetch } from '../../shared/api/client.js';
import { qk } from '../../shared/api/queries.js';

export interface EmployeeFilters {
  q?: string;
  department?: number;
  status?: 'active' | 'on_leave' | 'terminated';
  page?: number;
  pageSize?: number;
  sort?: 'name' | 'hireDate' | 'department';
  sortDir?: 'asc' | 'desc';
}

export function useEmployeesQuery(filters: EmployeeFilters) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return useQuery({
    queryKey: qk.employees.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiFetch<{ data: EmployeeDTO[]; page: number; pageSize: number; total: number }>(
        `/api/employees${qs ? `?${qs}` : ''}`,
      ),
  });
}

export function useEmployeeQuery(id: number | null) {
  return useQuery({
    queryKey: qk.employees.detail(id ?? -1),
    queryFn: () => apiFetch<EmployeeDTO>(`/api/employees/${id}`),
    enabled: id != null,
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; patch: z.infer<typeof EmployeeUpdate> }) =>
      apiFetch<EmployeeDTO>(`/api/employees/${v.id}`, { method: 'PATCH', body: v.patch }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['employees', 'list'] });
      qc.invalidateQueries({ queryKey: qk.employees.detail(v.id) });
      qc.invalidateQueries({ queryKey: ['audit', 'list'] });
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/employees/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees', 'list'] }),
  });
}
```

> Note: the `z` re-export above is incorrect; replace the import with: `import { z } from 'zod';` — `@naratala/shared` doesn't re-export zod.

- [ ] **Step 12.2: Fix `hooks.ts` import (apply note from 12.1)**

Replace the import line:
```ts
import { z } from '@naratala/shared';
```
with:
```ts
import type { z } from 'zod';
```

- [ ] **Step 12.3: Implement `EmployeeFilters.tsx`**

```tsx
// apps/web/src/features/employees/EmployeeFilters.tsx
import { useEffect, useState } from 'react';
import { useDepartmentsQuery } from '../departments/hooks.js';
import type { EmployeeFilters as F } from './hooks.js';

export function EmployeeFilters({
  value,
  onChange,
}: {
  value: F;
  onChange: (next: F) => void;
}): JSX.Element {
  const [q, setQ] = useState(value.q ?? '');
  const dq = useDepartmentsQuery();

  useEffect(() => {
    const t = setTimeout(() => onChange({ ...value, q: q || undefined }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="nt-filters">
      <input aria-label="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      <select
        aria-label="department"
        value={value.department ?? ''}
        onChange={(e) =>
          onChange({ ...value, department: e.target.value ? Number(e.target.value) : undefined })
        }
      >
        <option value="">All departments</option>
        {dq.data?.data.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <select
        aria-label="status"
        value={value.status ?? ''}
        onChange={(e) =>
          onChange({ ...value, status: (e.target.value || undefined) as F['status'] })
        }
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="on_leave">On leave</option>
        <option value="terminated">Terminated</option>
      </select>
    </div>
  );
}
```

- [ ] **Step 12.4: Implement `EmployeeTable.tsx`**

```tsx
// apps/web/src/features/employees/EmployeeTable.tsx
import type { EmployeeDTO } from '@naratala/shared';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../shared/ui/Avatar.js';
import { Pill } from '../../shared/ui/Pill.js';

export function EmployeeTable({ rows }: { rows: EmployeeDTO[] }): JSX.Element {
  const nav = useNavigate();
  return (
    <table className="nt-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Position</th>
          <th>Department</th>
          <th>Type</th>
          <th>Status</th>
          <th>Hired</th>
          <th>Salary</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => (
          <tr key={e.id} onClick={() => nav(`/employees/${e.id}`)} className="nt-tr-clickable">
            <td>
              <div className="nt-cell-with-avatar">
                <Avatar name={e.fullName} hue={e.avatarColorHue} size={28} />
                <span>{e.fullName}</span>
              </div>
            </td>
            <td>{e.position}</td>
            <td>{e.departmentName ?? '—'}</td>
            <td>{e.employmentType.replace('_', ' ')}</td>
            <td>
              <Pill tone={e.employmentStatus === 'active' ? 'good' : 'neutral'}>
                {e.employmentStatus}
              </Pill>
            </td>
            <td>{e.hireDate}</td>
            <td>{e.salaryAmount ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 12.5: Implement `EmployeeForm.tsx`**

```tsx
// apps/web/src/features/employees/EmployeeForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmployeeUpdate, type EmployeeDTO } from '@naratala/shared';
import { useUpdateEmployee } from './hooks.js';
import { useDepartmentsQuery } from '../departments/hooks.js';
import { usePermission } from '../../shared/permissions/usePermission.js';
import { ApiError } from '../../shared/api/ApiError.js';
import { toast } from 'sonner';
import { useState } from 'react';

type Input = {
  fullName: string;
  email: string;
  position: string;
  departmentId: number;
  employmentType: EmployeeDTO['employmentType'];
  employmentStatus: EmployeeDTO['employmentStatus'];
  hireDate: string;
  salaryAmount?: string;
  reason?: string;
};

export function EmployeeForm({
  employee,
  onClose,
}: {
  employee: EmployeeDTO;
  onClose: () => void;
}): JSX.Element {
  const canSalary = usePermission('employees:write:salary');
  const dq = useDepartmentsQuery();
  const m = useUpdateEmployee();
  const initialSalary = employee.salaryAmount ?? '';
  const { register, handleSubmit, watch, setError, formState } = useForm<Input>({
    resolver: zodResolver(EmployeeUpdate),
    defaultValues: {
      fullName: employee.fullName,
      email: employee.email,
      position: employee.position,
      departmentId: employee.departmentId,
      employmentType: employee.employmentType,
      employmentStatus: employee.employmentStatus,
      hireDate: employee.hireDate,
      salaryAmount: initialSalary,
      reason: '',
    },
  });
  const [salaryDirty, setSalaryDirty] = useState(false);
  const salary = watch('salaryAmount') ?? '';
  const dirty = salary !== initialSalary;
  if (dirty !== salaryDirty) setSalaryDirty(dirty);

  return (
    <form
      onSubmit={handleSubmit((v) => {
        const patch: Record<string, unknown> = { ...v };
        if (!salaryDirty) {
          delete patch.salaryAmount;
          delete patch.reason;
        }
        m.mutate(
          { id: employee.id, patch },
          {
            onSuccess: () => onClose(),
            onError: (err) => {
              if (err instanceof ApiError && err.fields) {
                for (const [k, v2] of Object.entries(err.fields)) {
                  setError(k as keyof Input, { message: v2[0] });
                }
                return;
              }
              toast.error(err instanceof ApiError ? err.message : 'Update failed');
            },
          },
        );
      })}
    >
      <label>
        Full name
        <input {...register('fullName')} />
      </label>
      {formState.errors.fullName && <p role="alert">{formState.errors.fullName.message}</p>}
      <label>
        Email
        <input type="email" {...register('email')} />
      </label>
      <label>
        Position
        <input {...register('position')} />
      </label>
      <label>
        Department
        <select {...register('departmentId', { valueAsNumber: true })}>
          {dq.data?.data.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Employment type
        <select {...register('employmentType')}>
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="contract">Contract</option>
          <option value="intern">Intern</option>
        </select>
      </label>
      <label>
        Status
        <select {...register('employmentStatus')}>
          <option value="active">Active</option>
          <option value="on_leave">On leave</option>
          <option value="terminated">Terminated</option>
        </select>
      </label>
      <label>
        Hire date
        <input type="date" {...register('hireDate')} />
      </label>
      {canSalary && (
        <label>
          Salary
          <input {...register('salaryAmount')} />
        </label>
      )}
      {canSalary && salaryDirty && (
        <label>
          Reason (≥ 10 chars required)
          <textarea {...register('reason')} />
        </label>
      )}
      {formState.errors.reason && <p role="alert">{formState.errors.reason.message}</p>}
      <div>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" disabled={m.isPending}>
          Save
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 12.6: Implement `EmployeeDrawer.tsx`**

```tsx
// apps/web/src/features/employees/EmployeeDrawer.tsx
import { useState } from 'react';
import type { EmployeeDTO } from '@naratala/shared';
import { useEmployeeQuery, useDeleteEmployee } from './hooks.js';
import { EmployeeForm } from './EmployeeForm.js';
import { usePermission } from '../../shared/permissions/usePermission.js';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export function EmployeeDrawer({ id }: { id: number }): JSX.Element {
  const q = useEmployeeQuery(id);
  const nav = useNavigate();
  const canEdit = usePermission('employees:write:any');
  const canDelete = usePermission('employees:write:any'); // delete also gated by admin via API
  const del = useDeleteEmployee();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') nav('/employees');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav]);

  if (q.isLoading) return <aside className="nt-drawer">Loading…</aside>;
  if (q.error || !q.data) return <aside className="nt-drawer">Not found</aside>;
  const e: EmployeeDTO = q.data;

  return (
    <aside className="nt-drawer" role="complementary" aria-label="employee details">
      <header>
        <h2>{e.fullName}</h2>
        <button type="button" onClick={() => nav('/employees')} aria-label="close">
          ×
        </button>
      </header>
      {editing ? (
        <EmployeeForm employee={e} onClose={() => setEditing(false)} />
      ) : (
        <>
          <section>
            <h3>Personal</h3>
            <dl>
              <dt>Email</dt>
              <dd>{e.email}</dd>
              <dt>Phone</dt>
              <dd>{e.phone ?? '—'}</dd>
              <dt>Pronouns</dt>
              <dd>{e.pronouns ?? '—'}</dd>
            </dl>
          </section>
          <section>
            <h3>Employment</h3>
            <dl>
              <dt>Department</dt>
              <dd>{e.departmentName ?? '—'}</dd>
              <dt>Type</dt>
              <dd>{e.employmentType}</dd>
              <dt>Status</dt>
              <dd>{e.employmentStatus}</dd>
              <dt>Hired</dt>
              <dd>{e.hireDate}</dd>
            </dl>
          </section>
          <section>
            <h3>Compensation</h3>
            {e.salaryAmount ? (
              <p>
                {e.salaryAmount} {e.salaryCurrency}
              </p>
            ) : (
              <span className="nt-pill tone-neutral">Hidden</span>
            )}
          </section>
          {canEdit && (
            <button type="button" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          {canDelete && !confirming && (
            <button type="button" onClick={() => setConfirming(true)}>
              Delete
            </button>
          )}
          {confirming && (
            <>
              <button
                type="button"
                onClick={() =>
                  del.mutate(e.id, { onSuccess: () => nav('/employees') })
                }
              >
                Confirm delete
              </button>
              <button type="button" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </>
          )}
        </>
      )}
    </aside>
  );
}
```

- [ ] **Step 12.7: Implement `EmployeesPage.tsx`**

```tsx
// apps/web/src/features/employees/EmployeesPage.tsx
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useEmployeesQuery, type EmployeeFilters } from './hooks.js';
import { EmployeeFilters as Filters } from './EmployeeFilters.js';
import { EmployeeTable } from './EmployeeTable.js';
import { EmployeeDrawer } from './EmployeeDrawer.js';
import { Card } from '../../shared/ui/Card.js';

export function EmployeesPage(): JSX.Element {
  const params = useParams<{ id?: string }>();
  const [filters, setFilters] = useState<EmployeeFilters>({ page: 1, pageSize: 25 });
  const q = useEmployeesQuery(filters);
  return (
    <div className="nt-employees-page">
      <Card title="Employees">
        <Filters value={filters} onChange={setFilters} />
        {q.isLoading && <p>Loading…</p>}
        {q.data && <EmployeeTable rows={q.data.data} />}
      </Card>
      {params.id && <EmployeeDrawer id={Number(params.id)} />}
    </div>
  );
}
```

- [ ] **Step 12.8: Write failing test for EmployeesPage**

```tsx
// apps/web/src/features/employees/EmployeesPage.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { EmployeesPage } from './EmployeesPage.js';
import { sampleEmployee } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('EmployeesPage', () => {
  it('renders rows and opens drawer on row click', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/employees/:id" element={<EmployeesPage />} />
      </Routes>,
      { route: '/employees' },
    );
    await waitFor(() => expect(screen.getByText(sampleEmployee.fullName)).toBeInTheDocument());
    await userEvent.click(screen.getByText(sampleEmployee.fullName));
    await waitFor(() => expect(screen.getByRole('complementary')).toBeInTheDocument());
  });

  it('search filter triggers a refetch with q parameter', async () => {
    const seen: string[] = [];
    server.use(
      http.get('/api/employees', ({ request }) => {
        const url = new URL(request.url);
        seen.push(url.searchParams.get('q') ?? '');
        return HttpResponse.json({ data: [sampleEmployee], page: 1, pageSize: 25, total: 1 });
      }),
    );
    renderWithProviders(
      <Routes>
        <Route path="/employees" element={<EmployeesPage />} />
      </Routes>,
      { route: '/employees' },
    );
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    await userEvent.type(screen.getByLabelText(/search/i), 'sample');
    await waitFor(() => expect(seen.some((s) => s === 'sample')).toBe(true), { timeout: 1500 });
  });
});
```

- [ ] **Step 12.9: Run — passes**

Run: `pnpm --filter web test EmployeesPage`
Expected: PASS (2 tests).

- [ ] **Step 12.10: Write failing test for EmployeeForm salary-reason gate**

```tsx
// apps/web/src/features/employees/EmployeeForm.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { EmployeeForm } from './EmployeeForm.js';
import { sampleEmployee } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('EmployeeForm', () => {
  it('changing salary without reason triggers server validation, surfaces field error', async () => {
    server.use(
      http.patch('/api/employees/:id', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_FAILED',
            message: 'invalid',
            details: { fields: { reason: ['reason (≥10 chars) is required'] } },
          },
          { status: 400 },
        ),
      ),
    );
    const onClose = () => {};
    renderWithProviders(<EmployeeForm employee={sampleEmployee} onClose={onClose} />);
    const salary = await screen.findByLabelText(/salary/i);
    await userEvent.clear(salary);
    await userEvent.type(salary, '20000000.00');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() =>
      expect(screen.getByText(/reason \(≥10 chars\)/i)).toBeInTheDocument(),
    );
  });

  it('with reason ≥10 chars succeeds', async () => {
    let seenBody: { reason?: string; salaryAmount?: string } | null = null;
    server.use(
      http.patch('/api/employees/:id', async ({ request }) => {
        seenBody = (await request.json()) as { reason?: string; salaryAmount?: string };
        return HttpResponse.json({ ...sampleEmployee, salaryAmount: seenBody.salaryAmount ?? null });
      }),
    );
    let closed = false;
    renderWithProviders(
      <EmployeeForm employee={sampleEmployee} onClose={() => (closed = true)} />,
    );
    const salary = await screen.findByLabelText(/salary/i);
    await userEvent.clear(salary);
    await userEvent.type(salary, '20000000.00');
    const reason = await screen.findByLabelText(/reason/i);
    await userEvent.type(reason, 'annual review increase');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(closed).toBe(true));
    expect(seenBody!.reason).toMatch(/annual/);
  });
});
```

- [ ] **Step 12.11: Run — passes**

Run: `pnpm --filter web test EmployeeForm`
Expected: PASS (2 tests).

- [ ] **Step 12.12: Wire route, commit**

In `routes.tsx` swap `<Placeholder name="employees" />` for `<EmployeesPage />` and add the import.

```bash
git add apps/web/src/features/employees/ apps/web/src/app/routes.tsx
git commit -m "feat(web): employees page, drawer, and form (salary gate + reason)"
```

---

## Task 13: Users feature

**Files:**
- Create: `apps/web/src/features/users/hooks.ts`
- Create: `apps/web/src/features/users/UsersPage.tsx`
- Create: `apps/web/src/features/users/UserEditModal.tsx`
- Create: `apps/web/src/features/users/UsersPage.test.tsx`
- Modify: `apps/web/src/app/routes.tsx`

- [ ] **Step 13.1: Create `hooks.ts`**

```ts
// apps/web/src/features/users/hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserDTO } from '@naratala/shared';
import { apiFetch } from '../../shared/api/client.js';
import { qk } from '../../shared/api/queries.js';

export function useUsersQuery(filters: { page?: number; pageSize?: number }) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined) params.set(k, String(v));
  }
  const qs = params.toString();
  return useQuery({
    queryKey: qk.users.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiFetch<{ data: UserDTO[]; page: number; pageSize: number; total: number }>(
        `/api/users${qs ? `?${qs}` : ''}`,
      ),
  });
}

export function usePatchUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; patch: Partial<UserDTO> }) =>
      apiFetch<UserDTO>(`/api/users/${v.id}`, { method: 'PATCH', body: v.patch }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users', 'list'] });
      qc.invalidateQueries({ queryKey: ['audit', 'list'] });
    },
  });
}

export function useForceLogoutUser() {
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/users/${id}/force-logout`, { method: 'POST' }),
  });
}
```

- [ ] **Step 13.2: Implement `UserEditModal.tsx`**

```tsx
// apps/web/src/features/users/UserEditModal.tsx
import { useState } from 'react';
import type { UserDTO } from '@naratala/shared';
import { usePatchUser } from './hooks.js';
import { ApiError } from '../../shared/api/ApiError.js';
import { toast } from 'sonner';

export function UserEditModal({
  user,
  onClose,
}: {
  user: UserDTO;
  onClose: () => void;
}): JSX.Element {
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [language, setLanguage] = useState(user.language);
  const m = usePatchUser();
  return (
    <div role="dialog" aria-label="edit user" className="nt-modal">
      <h3>{user.email}</h3>
      <label>
        Role
        <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
          <option value="admin">admin</option>
          <option value="hr">hr</option>
          <option value="manager">manager</option>
          <option value="employee">employee</option>
        </select>
      </label>
      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="active">active</option>
          <option value="pending">pending</option>
          <option value="disabled">disabled</option>
        </select>
      </label>
      <label>
        Language
        <select value={language} onChange={(e) => setLanguage(e.target.value as typeof language)}>
          <option value="id">Bahasa Indonesia</option>
          <option value="en">English</option>
        </select>
      </label>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
      <button
        type="button"
        disabled={m.isPending}
        onClick={() =>
          m.mutate(
            { id: user.id, patch: { role, status, language } },
            {
              onSuccess: onClose,
              onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Update failed'),
            },
          )
        }
      >
        Save
      </button>
    </div>
  );
}
```

- [ ] **Step 13.3: Implement `UsersPage.tsx`**

```tsx
// apps/web/src/features/users/UsersPage.tsx
import { useState } from 'react';
import { useUsersQuery, useForceLogoutUser } from './hooks.js';
import { UserEditModal } from './UserEditModal.js';
import { Card } from '../../shared/ui/Card.js';
import { Pill } from '../../shared/ui/Pill.js';
import { toast } from 'sonner';
import type { UserDTO } from '@naratala/shared';

export function UsersPage(): JSX.Element {
  const q = useUsersQuery({ page: 1, pageSize: 50 });
  const force = useForceLogoutUser();
  const [editing, setEditing] = useState<UserDTO | null>(null);
  return (
    <Card title="Users">
      {q.isLoading && <p>Loading…</p>}
      {q.data && (
        <table className="nt-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>MFA</th>
              <th>Last login</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {q.data.data.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>
                  <Pill tone={u.role === 'admin' ? 'info' : 'neutral'}>{u.role}</Pill>
                </td>
                <td>
                  <Pill tone={u.status === 'active' ? 'good' : 'warn'}>{u.status}</Pill>
                </td>
                <td>{u.mfaEnabled ? '✓' : '—'}</td>
                <td>{u.lastLoginAt ?? '—'}</td>
                <td>
                  <button type="button" onClick={() => setEditing(u)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      force.mutate(u.id, {
                        onSuccess: () => toast.success('Sessions revoked'),
                      })
                    }
                  >
                    Force logout
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editing && <UserEditModal user={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}
```

- [ ] **Step 13.4: Write failing test**

```tsx
// apps/web/src/features/users/UsersPage.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { UsersPage } from './UsersPage.js';
import { adminUser } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('UsersPage', () => {
  it('renders rows', async () => {
    renderWithProviders(<UsersPage />);
    await waitFor(() => expect(screen.getByText(adminUser.email)).toBeInTheDocument());
  });

  it('last-admin demote → toast surfaces server message', async () => {
    server.use(
      http.patch('/api/users/:id', () =>
        HttpResponse.json(
          { code: 'VALIDATION_FAILED', message: 'cannot demote last admin' },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<UsersPage />);
    await waitFor(() => expect(screen.getByText(adminUser.email)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await userEvent.selectOptions(screen.getByLabelText(/role/i), 'employee');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(screen.getByText(/cannot demote last admin/i)).toBeInTheDocument());
  });

  it('force logout calls endpoint', async () => {
    let called = false;
    server.use(
      http.post('/api/users/:id/force-logout', () => {
        called = true;
        return HttpResponse.json({ ok: true });
      }),
    );
    renderWithProviders(<UsersPage />);
    await waitFor(() => expect(screen.getByText(adminUser.email)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /force logout/i }));
    await waitFor(() => expect(called).toBe(true));
  });
});
```

- [ ] **Step 13.5: Run — passes**

Run: `pnpm --filter web test UsersPage`
Expected: PASS (3 tests).

- [ ] **Step 13.6: Wire route, commit**

In `routes.tsx` replace `<Placeholder name="users" />` with `<UsersPage />` and add the import.

```bash
git add apps/web/src/features/users/ apps/web/src/app/routes.tsx
git commit -m "feat(web): users page + edit modal + force-logout"
```

---

## Task 14: Audit feature

**Files:**
- Create: `apps/web/src/features/audit/hooks.ts`
- Create: `apps/web/src/features/audit/AuditRow.tsx`
- Create: `apps/web/src/features/audit/AuditPage.tsx`
- Create: `apps/web/src/features/audit/AuditPage.test.tsx`
- Modify: `apps/web/src/app/routes.tsx`

- [ ] **Step 14.1: Create `hooks.ts`**

```ts
// apps/web/src/features/audit/hooks.ts
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../shared/api/client.js';
import { qk } from '../../shared/api/queries.js';

export interface AuditEntry {
  id: number;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: number | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface AuditFilters {
  action?: string;
  entityType?: string;
  entityId?: number;
  page?: number;
  pageSize?: number;
}

export function useAuditQuery(filters: AuditFilters) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return useQuery({
    queryKey: qk.audit.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiFetch<{ data: AuditEntry[]; page: number; pageSize: number; total: number }>(
        `/api/audit${qs ? `?${qs}` : ''}`,
      ),
  });
}
```

- [ ] **Step 14.2: Implement `AuditRow.tsx`**

```tsx
// apps/web/src/features/audit/AuditRow.tsx
import { useState } from 'react';
import type { AuditEntry } from './hooks.js';
import { Pill } from '../../shared/ui/Pill.js';

export function AuditRow({ row }: { row: AuditEntry }): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr>
        <td>{new Date(row.createdAt).toLocaleString()}</td>
        <td>{row.actorEmail}</td>
        <td>
          <Pill tone="info">{row.action}</Pill>
        </td>
        <td>{row.entityType}</td>
        <td>{row.entityId ?? '—'}</td>
        <td>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? 'Hide' : 'Show'}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6}>
            <pre className="nt-audit-json">{JSON.stringify({ before: row.before, after: row.after }, null, 2)}</pre>
          </td>
        </tr>
      )}
    </>
  );
}
```

- [ ] **Step 14.3: Implement `AuditPage.tsx`**

```tsx
// apps/web/src/features/audit/AuditPage.tsx
import { useState } from 'react';
import { useAuditQuery, type AuditFilters } from './hooks.js';
import { AuditRow } from './AuditRow.js';
import { Card } from '../../shared/ui/Card.js';

export function AuditPage(): JSX.Element {
  const [filters, setFilters] = useState<AuditFilters>({ page: 1, pageSize: 50 });
  const q = useAuditQuery(filters);
  return (
    <Card title="Audit log">
      <div className="nt-filters">
        <select
          aria-label="action"
          value={filters.action ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value || undefined }))}
        >
          <option value="">All actions</option>
          <option value="employee.update">employee.update</option>
          <option value="employee.create">employee.create</option>
          <option value="employee.delete">employee.delete</option>
          <option value="user.update">user.update</option>
          <option value="invite.create">invite.create</option>
        </select>
        <select
          aria-label="entityType"
          value={filters.entityType ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value || undefined }))}
        >
          <option value="">All entities</option>
          <option value="employee">employee</option>
          <option value="user">user</option>
          <option value="invite">invite</option>
          <option value="department">department</option>
        </select>
      </div>
      {q.isLoading && <p>Loading…</p>}
      {q.data && (
        <table className="nt-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>ID</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {q.data.data.map((r) => (
              <AuditRow key={r.id} row={r} />
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
```

- [ ] **Step 14.4: Write failing test**

```tsx
// apps/web/src/features/audit/AuditPage.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { AuditPage } from './AuditPage.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const entry = {
  id: 1,
  actorEmail: 'admin@naratala.local',
  action: 'employee.update',
  entityType: 'employee',
  entityId: 10,
  before: { salaryAmount: '15000000.00' },
  after: { salaryAmount: '20000000.00' },
  createdAt: '2026-04-28T10:00:00.000Z',
};

describe('AuditPage', () => {
  it('renders entries and toggles JSON detail', async () => {
    server.use(
      http.get('/api/audit', () =>
        HttpResponse.json({ data: [entry], page: 1, pageSize: 50, total: 1 }),
      ),
    );
    renderWithProviders(<AuditPage />);
    await waitFor(() => expect(screen.getByText('employee.update')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /show/i }));
    expect(screen.getByText(/20000000\.00/)).toBeInTheDocument();
  });

  it('filter changes refetch with action param', async () => {
    const seen: string[] = [];
    server.use(
      http.get('/api/audit', ({ request }) => {
        const url = new URL(request.url);
        seen.push(url.searchParams.get('action') ?? '');
        return HttpResponse.json({ data: [], page: 1, pageSize: 50, total: 0 });
      }),
    );
    renderWithProviders(<AuditPage />);
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    await userEvent.selectOptions(screen.getByLabelText(/action/i), 'employee.update');
    await waitFor(() => expect(seen.includes('employee.update')).toBe(true));
  });
});
```

- [ ] **Step 14.5: Run — passes**

Run: `pnpm --filter web test AuditPage`
Expected: PASS (2 tests).

- [ ] **Step 14.6: Wire route, commit**

In `routes.tsx` replace `<Placeholder name="audit" />` with `<AuditPage />` and add the import.

```bash
git add apps/web/src/features/audit/ apps/web/src/app/routes.tsx
git commit -m "feat(web): audit page (filters + JSON expand)"
```

---

## Task 15: Settings/Profile + CI

**Files:**
- Create: `apps/web/src/features/settings/ProfilePage.tsx`
- Create: `apps/web/src/features/settings/ChangePasswordCard.tsx`
- Create: `apps/web/src/features/settings/MfaCard.tsx`
- Create: `apps/web/src/features/settings/ChangePasswordCard.test.tsx`
- Create: `apps/web/src/features/settings/MfaCard.test.tsx`
- Modify: `apps/web/src/app/routes.tsx`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 15.1: Implement `ChangePasswordCard.tsx`**

```tsx
// apps/web/src/features/settings/ChangePasswordCard.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { PasswordChangeBody } from '@naratala/shared';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from '../../shared/ui/Card.js';
import { useAuth } from '../../shared/auth/useAuth.js';
import { apiFetch } from '../../shared/api/client.js';
import { ApiError } from '../../shared/api/ApiError.js';
import { PasswordStrengthMeter } from '../auth/PasswordStrengthMeter.js';

type Input = { currentPassword: string; newPassword: string };

export function ChangePasswordCard(): JSX.Element {
  const { signOut } = useAuth();
  const nav = useNavigate();
  const { register, handleSubmit, watch, setError, formState } = useForm<Input>({
    resolver: zodResolver(PasswordChangeBody),
    defaultValues: { currentPassword: '', newPassword: '' },
  });
  const m = useMutation({
    mutationFn: (v: Input) =>
      apiFetch('/api/auth/password/change', { method: 'POST', body: v }),
    onSuccess: async () => {
      toast.success('Password changed — please sign in again');
      await signOut();
      nav('/login', { replace: true });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.fields?.['newPassword']) {
        setError('newPassword', { message: e.fields['newPassword'][0] });
        return;
      }
      toast.error(e instanceof ApiError ? e.message : 'Change failed');
    },
  });
  return (
    <Card title="Change password">
      <form onSubmit={handleSubmit((v) => m.mutate(v))}>
        <label>
          Current password
          <input type="password" autoComplete="current-password" {...register('currentPassword')} />
        </label>
        {formState.errors.currentPassword && (
          <p role="alert">{formState.errors.currentPassword.message}</p>
        )}
        <label>
          New password
          <input type="password" autoComplete="new-password" {...register('newPassword')} />
        </label>
        <PasswordStrengthMeter password={watch('newPassword')} />
        {formState.errors.newPassword && (
          <p role="alert">{formState.errors.newPassword.message}</p>
        )}
        <button type="submit" disabled={m.isPending}>
          Save
        </button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 15.2: Write failing test for ChangePasswordCard**

```tsx
// apps/web/src/features/settings/ChangePasswordCard.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { ChangePasswordCard } from './ChangePasswordCard.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ChangePasswordCard', () => {
  it('on success → signs out → navigates to /login', async () => {
    server.use(http.post('/api/auth/password/change', () => HttpResponse.json({ ok: true })));
    renderWithProviders(
      <Routes>
        <Route path="/" element={<ChangePasswordCard />} />
        <Route path="/login" element={<div data-testid="login">login</div>} />
      </Routes>,
    );
    await userEvent.type(screen.getByLabelText(/current password/i), 'old-password-12');
    await userEvent.type(screen.getByLabelText(/new password/i), 'new-password-99');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
  });
});
```

- [ ] **Step 15.3: Run — passes**

Run: `pnpm --filter web test ChangePasswordCard`
Expected: PASS.

- [ ] **Step 15.4: Implement `MfaCard.tsx`**

```tsx
// apps/web/src/features/settings/MfaCard.tsx
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Card } from '../../shared/ui/Card.js';
import { useAuth } from '../../shared/auth/useAuth.js';
import { apiFetch } from '../../shared/api/client.js';
import { ApiError } from '../../shared/api/ApiError.js';

export function MfaCard(): JSX.Element {
  const { user, refreshMe } = useAuth();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [disableForm, setDisableForm] = useState<{ password: string; code: string } | null>(null);

  const start = useMutation({
    mutationFn: () =>
      apiFetch<{ secret: string; otpauthUrl: string }>('/api/auth/mfa/setup/start', {
        method: 'POST',
      }),
    onSuccess: (d) => setSetup(d),
  });

  const confirm = useMutation({
    mutationFn: () =>
      apiFetch<{ recoveryCodes: string[] }>('/api/auth/mfa/setup/confirm', {
        method: 'POST',
        body: { secret: setup!.secret, code },
      }),
    onSuccess: async (d) => {
      setRecovery(d.recoveryCodes);
      setSetup(null);
      setCode('');
      await refreshMe();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'MFA confirm failed'),
  });

  const disable = useMutation({
    mutationFn: (v: { currentPassword: string; code: string }) =>
      apiFetch('/api/auth/mfa/disable', { method: 'POST', body: v }),
    onSuccess: async () => {
      setDisableForm(null);
      await refreshMe();
      toast.success('MFA disabled');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'MFA disable failed'),
  });

  if (!user) return <Card title="MFA">…</Card>;

  if (recovery) {
    return (
      <Card title="MFA enabled">
        <p>Save these recovery codes — they will not be shown again.</p>
        <ul data-testid="recovery-codes">
          {recovery.map((c) => (
            <li key={c}>
              <code>{c}</code>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setRecovery(null)}>
          I've saved them
        </button>
      </Card>
    );
  }

  if (user.mfaEnabled && !disableForm) {
    return (
      <Card title="MFA enabled">
        <button type="button" onClick={() => setDisableForm({ password: '', code: '' })}>
          Disable MFA
        </button>
      </Card>
    );
  }

  if (user.mfaEnabled && disableForm) {
    return (
      <Card title="Disable MFA">
        <label>
          Current password
          <input
            type="password"
            value={disableForm.password}
            onChange={(e) => setDisableForm((d) => ({ ...d!, password: e.target.value }))}
          />
        </label>
        <label>
          6-digit code
          <input
            value={disableForm.code}
            onChange={(e) => setDisableForm((d) => ({ ...d!, code: e.target.value }))}
          />
        </label>
        <button
          type="button"
          onClick={() =>
            disable.mutate({
              currentPassword: disableForm.password,
              code: disableForm.code,
            })
          }
        >
          Confirm disable
        </button>
        <button type="button" onClick={() => setDisableForm(null)}>
          Cancel
        </button>
      </Card>
    );
  }

  if (setup) {
    return (
      <Card title="Enable MFA">
        <p>Scan with your authenticator app:</p>
        <QRCodeSVG value={setup.otpauthUrl} size={192} />
        <p>
          Or enter manually: <code>{setup.secret}</code>
        </p>
        <label>
          6-digit code
          <input value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <button type="button" onClick={() => confirm.mutate()} disabled={code.length !== 6}>
          Confirm
        </button>
      </Card>
    );
  }

  return (
    <Card title="Multi-factor authentication">
      <p>Add an extra step at sign-in for stronger security.</p>
      <button type="button" onClick={() => start.mutate()}>
        Enable MFA
      </button>
    </Card>
  );
}
```

- [ ] **Step 15.5: Write failing test for MfaCard enable flow**

```tsx
// apps/web/src/features/settings/MfaCard.test.tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { MfaCard } from './MfaCard.js';
import { adminUser } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('MfaCard', () => {
  it('enable flow: start → QR → confirm → recovery codes shown', async () => {
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({ user: { ...adminUser, mfaEnabled: false } }),
      ),
      http.post('/api/auth/mfa/setup/start', () =>
        HttpResponse.json({ secret: 'JBSWY3DPEHPK3PXP', otpauthUrl: 'otpauth://test' }),
      ),
      http.post('/api/auth/mfa/setup/confirm', () =>
        HttpResponse.json({ recoveryCodes: ['code-A', 'code-B', 'code-C'] }),
      ),
    );
    renderWithProviders(<MfaCard />);
    await userEvent.click(await screen.findByRole('button', { name: /enable mfa/i }));
    await waitFor(() => expect(screen.getByText(/JBSWY3DPEHPK3PXP/)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/6-digit/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }));
    await waitFor(() => expect(screen.getByTestId('recovery-codes')).toBeInTheDocument());
    expect(screen.getByText('code-A')).toBeInTheDocument();
  });

  it('disable flow requires password + code', async () => {
    let called = false;
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({ user: { ...adminUser, mfaEnabled: true } }),
      ),
      http.post('/api/auth/mfa/disable', () => {
        called = true;
        return HttpResponse.json({ ok: true });
      }),
    );
    renderWithProviders(<MfaCard />);
    await userEvent.click(await screen.findByRole('button', { name: /disable mfa/i }));
    await userEvent.type(screen.getByLabelText(/current password/i), 'p@ssword99');
    await userEvent.type(screen.getByLabelText(/6-digit/i), '654321');
    await userEvent.click(screen.getByRole('button', { name: /confirm disable/i }));
    await waitFor(() => expect(called).toBe(true));
  });
});
```

- [ ] **Step 15.6: Run — passes**

Run: `pnpm --filter web test MfaCard`
Expected: PASS (2 tests).

- [ ] **Step 15.7: Implement `ProfilePage.tsx`**

```tsx
// apps/web/src/features/settings/ProfilePage.tsx
import { Card } from '../../shared/ui/Card.js';
import { useAuth } from '../../shared/auth/useAuth.js';
import { Pill } from '../../shared/ui/Pill.js';
import { LanguageSwitcher } from './LanguageSwitcher.js';
import { ChangePasswordCard } from './ChangePasswordCard.js';
import { MfaCard } from './MfaCard.js';

export function ProfilePage(): JSX.Element {
  const { user } = useAuth();
  if (!user) return <p>—</p>;
  return (
    <div className="nt-stack">
      <Card title="Profile">
        <p>
          <strong>{user.email}</strong> <Pill tone="info">{user.role}</Pill>
        </p>
        <LanguageSwitcher />
      </Card>
      <ChangePasswordCard />
      <MfaCard />
    </div>
  );
}
```

- [ ] **Step 15.8: Wire route, run all tests**

In `routes.tsx` replace `<Placeholder name="profile" />` with `<ProfilePage />` and add import.

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web build`
Expected: all green.

- [ ] **Step 15.9: Commit**

```bash
git add apps/web/src/features/settings/ apps/web/src/app/routes.tsx
git commit -m "feat(web): profile page + change password + MFA enable/disable"
```

- [ ] **Step 15.10: Extend CI to run web tests + build**

Edit `.github/workflows/ci.yml`. The existing `test` job runs `pnpm test` which the root `package.json` already maps to `pnpm -r --parallel test`, so the web vitest suite is picked up automatically once `pnpm install --frozen-lockfile` succeeds. The `build` job runs `pnpm -r build` which already includes web. The only intentional change is to ensure the web test job has a DOM (jsdom is local). No yaml change is required for the API tests, but to make the web tests' jsdom unambiguous we add an env line:

Locate the `test` job's `env:` block (around line 43–53 of the existing file) and add:

```yaml
      VITE_DISABLE_PROXY: '1'
```

(below `NODE_ENV: test`). This is harmless to API tests and signals to vite-related code that proxy isn't needed.

If you instead need a dedicated web step (recommended for readable CI logs), add a new job after `test`:

```yaml
  test-web:
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
      - run: pnpm --filter web typecheck
      - run: pnpm --filter web lint
      - run: pnpm --filter web test
      - run: pnpm --filter web build
```

Add this job and remove the redundant web work from the root `test` job (it will still run because of `pnpm -r --parallel test`, but the dedicated job gives clearer signal). Concretely: keep the `test` job exactly as-is and just add `test-web` underneath.

- [ ] **Step 15.11: Run lint + typecheck + tests once more**

Run: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm -r build`
Expected: all green.

- [ ] **Step 15.12: Commit CI**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add dedicated test-web job (typecheck + lint + test + build)"
```

---

## Task 16: Manual smoke + finishing

- [ ] **Step 16.1: Start API**

Run (terminal A): `pnpm --filter api dev`
Expected: api listening on `:3000`.

- [ ] **Step 16.2: Start web**

Run (terminal B): `pnpm --filter web dev`
Expected: vite serving on `http://localhost:5173`.

- [ ] **Step 16.3: Smoke check**

In a browser:
1. Navigate to `http://localhost:5173/login`
2. Sign in with `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` from `apps/api/.env`
3. Confirm `/employees` renders rows from the seeded data
4. Open an employee drawer → click Edit → change salary → enter ≥10-char reason → Save → drawer refetches → audit list (`/audit`) shows a new entry
5. Sign out → sign in as a non-admin role (use a seeded employee or one created via invite) → confirm salary appears as `—` and audit page is forbidden (403 page)

- [ ] **Step 16.4: Use the finishing-a-development-branch skill**

Announce: "I'm using the finishing-a-development-branch skill to complete this work."

Follow that skill: verify tests pass (`pnpm test`), present the four options (merge / PR / keep / discard) to the user, execute the chosen path.

---

## Notes for Implementation

- **Strict TS settings** (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) mean optional props/array reads must be guarded. Pattern: `const v = arr[0]; if (!v) return …;`.
- **`@naratala/shared` type-only re-export quirk:** zod itself is **not** re-exported. Always `import { z } from 'zod'`.
- **MSW v2 handler API:** use `http.get/post/...`, `HttpResponse.json(body, init)`, and `await request.json()` inside handlers.
- **TanStack Query v5:** mutation hooks expose `mutate` (fire-and-forget) and `mutateAsync`. Tests prefer `mutate` with `onSuccess`/`onError` callbacks; production code can choose either.
- **React Hook Form + zodResolver:** when the schema includes a `.refine(...)` (like `EmployeeUpdate`), the resolver fires that refinement on submit. Surface `formState.errors.reason.message` directly.
- **Avoid double-running queries** in `<EmployeesPage>` when a drawer route mounts a child component that also queries — the drawer reads `useEmployeeQuery(id)`; the page list runs separately. Both share the cache.
- **Auth boot race:** `AuthProvider` starts in `loading`, calls `/me`; `RequireAuth` shows spinner during loading, so no flash to login.
- **Single-flight refresh** uses a module-level `refreshPromise` cleared on next tick. The test "two concurrent 401s share a single refresh" exercises this.
