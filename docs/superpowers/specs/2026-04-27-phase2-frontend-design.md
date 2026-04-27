# Naratala HRIS — Phase 2 Frontend Design

**Date:** 2026-04-27
**Scope:** SPA frontend at `apps/web/`, wiring Phase 1 backend (auth, employees, departments, users, audit, invites). Absence/Payroll/Benefits/Recruiting deferred.

---

## §1 Architecture overview

A new `apps/web` Vite + React 18 + TypeScript SPA peer to `apps/api`, sharing `packages/shared` for Zod schemas, permissions, and DTO types.

- **Build:** Vite 5, TS strict (mirrors `apps/api`: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`)
- **Routing:** React Router v6 with `RequireAuth` layout guard and `RequirePermission` element wrapper
- **Data:** TanStack Query v5 + a thin `apiClient` (typed `fetch` wrapper that runs Zod parse on responses, handles silent refresh on 401, throws typed `ApiError`)
- **Auth:** `AuthProvider` keeps `{user, accessToken, status}` in React context; access token in-memory only; refresh cookie auto-included via `credentials: 'include'`
- **Styling:** Existing root `styles.css` copied verbatim into `apps/web/src/styles.css`; component class names preserved 1:1
- **Forms:** React Hook Form + `@hookform/resolvers/zod` against shared schemas
- **i18n:** `react-i18next` with `id` (default) + `en` bundles
- **Toasts:** `sonner`
- **Tests:** Vitest + RTL + `msw` for API mocking; no e2e in Plan 2
- **Dev:** Vite proxy `/api` → `http://localhost:3000`; web on `:5173`

---

## §2 File structure

```
apps/web/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── index.html
├── public/
└── src/
    ├── main.tsx
    ├── styles.css                   (verbatim copy of root styles.css)
    │
    ├── app/
    │   ├── App.tsx
    │   ├── routes.tsx
    │   ├── RequireAuth.tsx
    │   └── RequirePermission.tsx
    │
    ├── shared/
    │   ├── api/
    │   │   ├── client.ts
    │   │   ├── ApiError.ts
    │   │   └── queries.ts
    │   ├── auth/
    │   │   ├── AuthProvider.tsx
    │   │   ├── useAuth.ts
    │   │   └── usePermission.ts
    │   ├── i18n/
    │   │   ├── index.ts
    │   │   ├── id.json
    │   │   └── en.json
    │   ├── ui/
    │   │   ├── Button.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Drawer.tsx
    │   │   ├── Table.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Avatar.tsx
    │   │   ├── EmptyState.tsx
    │   │   ├── Skeleton.tsx
    │   │   └── icons.tsx
    │   ├── layout/
    │   │   ├── Shell.tsx
    │   │   ├── Sidebar.tsx
    │   │   └── TopBar.tsx
    │   ├── format/
    │   │   ├── currency.ts
    │   │   └── date.ts
    │   └── toast.ts
    │
    ├── features/
    │   ├── auth/
    │   │   ├── LoginPage.tsx
    │   │   ├── MfaChallengePage.tsx
    │   │   ├── ForgotPasswordPage.tsx
    │   │   ├── ResetPasswordPage.tsx
    │   │   └── api.ts
    │   ├── invites/
    │   │   ├── AcceptInvitePage.tsx
    │   │   └── api.ts
    │   ├── employees/
    │   │   ├── EmployeesPage.tsx
    │   │   ├── EmployeeDrawer.tsx
    │   │   ├── EmployeeForm.tsx
    │   │   ├── EmployeeFilters.tsx
    │   │   ├── EmployeeTable.tsx
    │   │   └── api.ts
    │   ├── departments/
    │   │   ├── DepartmentsPage.tsx
    │   │   └── api.ts
    │   ├── users/
    │   │   ├── UsersPage.tsx
    │   │   ├── UserEditModal.tsx
    │   │   └── api.ts
    │   ├── audit/
    │   │   ├── AuditPage.tsx
    │   │   ├── AuditRow.tsx
    │   │   └── api.ts
    │   └── settings/
    │       ├── ProfilePage.tsx
    │       ├── ChangePasswordCard.tsx
    │       ├── MfaCard.tsx
    │       └── api.ts
    │
    └── test/
        ├── setup.ts
        ├── server.ts
        └── utils.tsx
```

**Boundaries:**
- `shared/` = no business logic, reusable across features
- `features/<name>/` = self-contained: page components, queries/mutations, types
- `apps/web/` never imports from `apps/api/` — only `packages/shared`
- Each feature owns its `api.ts`; cross-feature data access via `shared/api/queries.ts` keyspace

---

## §3 Data flow & API client

### `shared/api/client.ts`

- Signature: `apiFetch<T>(path, { method, body, schema, signal }) → Promise<T>`
- Always sends `credentials: 'include'`
- Adds `Authorization: Bearer <accessToken>` from a token getter passed at module init (not from React context — usable outside components)
- `Content-Type: application/json` when body present; serializes JSON
- On 2xx with `schema`, runs `schema.parse(json)`; on Zod failure throws `ApiError('VALIDATION', 'response shape')`
- On 401 (not already refreshing): calls `POST /api/auth/refresh` once (deduplicated via in-flight promise), retries the original request once. If refresh fails → `AuthProvider.signOut()` + redirect to `/login` (unless on a public route)
- On non-2xx: parses `{ code, message, fields? }` per Phase 1 contract → throws `ApiError`
- Network/abort → `ApiError('NETWORK', '…')`

### `shared/api/ApiError.ts`

```ts
class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
    public fields?: Record<string, string[]>
  ) { super(message); }
}
```

### TanStack Query usage

- One `QueryClient` at root: `staleTime: 30s`, `retry: (n, err) => err.code === 'NETWORK' && n < 2`, `refetchOnWindowFocus: false`
- Feature hooks: `useEmployeesQuery(filters)`, `useEmployeeDetailQuery(id)`, `useUpdateEmployeeMutation()`, etc.
- Keys via `shared/api/queries.ts` factory: `qk.employees.list(filters)`, `qk.employees.detail(id)`, `qk.departments.all()`, `qk.audit.list(filters)`
- Mutations invalidate relevant keys; salary update also invalidates `qk.audit.all`
- Errors: default `onError` shows `toast.error(messageFor(err))`; component overrides for inline RHF errors

### Auth integration

- On boot, `AuthProvider` runs `apiFetch('/api/auth/me')`; success → authenticated; 401 (after refresh attempt) → unauthenticated
- `loginMutation` writes `{accessToken, user}` into AuthProvider via `setAuth(...)`
- `logoutMutation` calls `POST /api/auth/logout`, clears state, navigates `/login`
- `useAuth()` exposes `{ user, accessToken, status, signIn, signOut, refresh }`

### Permissions

- `usePermission(perm)` → boolean using `hasPermission(user.role, perm)` from `@naratala/shared`
- `<RequirePermission perm="..." fallback={<Forbidden/>}>` for route gating
- Sidebar items hidden via `usePermission` (no flicker)

### Forms

- All forms use RHF + `zodResolver(schema)` against `@naratala/shared`
- Server `fields` from `ApiError` mapped via `setError(k, { message: msgs[0] })`

---

## §4 Auth flow & routing

### Route tree

```
<Routes>
  {/* public */}
  <Route path="/login"                element={<LoginPage/>}/>
  <Route path="/login/mfa"            element={<MfaChallengePage/>}/>
  <Route path="/password/forgot"      element={<ForgotPasswordPage/>}/>
  <Route path="/password/reset"       element={<ResetPasswordPage/>}/>      {/* ?token */}
  <Route path="/invite/accept"        element={<AcceptInvitePage/>}/>       {/* ?token */}

  {/* protected */}
  <Route element={<RequireAuth/>}>
    <Route element={<Shell/>}>
      <Route index                    element={<Navigate to="/employees" replace/>}/>
      <Route path="/employees"        element={<EmployeesPage/>}/>
      <Route path="/employees/:id"    element={<EmployeesPage/>}/>
      <Route path="/employees/new"    element={
        <RequirePermission perm="employees:write:any"><EmployeesPage withNewModal/></RequirePermission>
      }/>
      <Route path="/departments"      element={<DepartmentsPage/>}/>
      <Route path="/users"            element={
        <RequirePermission perm="users:read:any"><UsersPage/></RequirePermission>
      }/>
      <Route path="/audit"            element={
        <RequirePermission perm="audit:read"><AuditPage/></RequirePermission>
      }/>
      <Route path="/settings/profile" element={<ProfilePage/>}/>
      <Route path="*"                 element={<NotFoundPage/>}/>
    </Route>
  </Route>
</Routes>
```

### `<RequireAuth>`
- `'loading'` → `<FullPageSpinner/>`
- `'unauthenticated'` → `<Navigate to="/login" replace state={{ from: location }}/>`
- `'authenticated'` → `<Outlet/>`

### `<RequirePermission>`
- `false` → renders 403 page (URL preserved)
- `true` → `{children}`

### Login flow
1. `LoginPage` — RHF `{email, password}`, validates with `LoginBody` from shared
2. `loginMutation`:
   - `{ kind: 'tokens' }` → `setAuth({user, accessToken})` → navigate to `state.from?.pathname || '/employees'`
   - `{ kind: 'mfa', mfaToken }` → store mfaToken in router state → `navigate('/login/mfa')`
3. `MfaChallengePage` — RHF `{code: /^\d{6}$/}`, calls `/api/auth/mfa/verify` with `Authorization: Bearer <mfaToken>`, then same success path

### Forgot/reset
- `ForgotPasswordPage`: email → `POST /api/auth/password/forgot` → always shows generic success
- `ResetPasswordPage`: reads `?token=`, RHF `{password, confirmPassword}` with strength meter; on 410 → "link expired" + retry link; on success → toast + `/login`

### Invite accept
- `AcceptInvitePage`: reads `?token=`, calls `GET /api/invites/view/:token` to show `{email, fullName, expiresAt}`; RHF `{password, confirmPassword}`; on submit → `POST /api/invites/accept` → IssuedTokens → setAuth → navigate `/employees`
- 410 → "invite expired or already accepted" empty state

### Logout
- TopBar avatar menu → `signOut()` → mutation + clear context + `navigate('/login')`

### Boot sequence
1. Status `'loading'`
2. `GET /api/auth/me`:
   - 200 → `'authenticated'`
   - 401 → `'unauthenticated'`

### Session-refresh edge cases
- Multiple in-flight 401s → all await the same single-flight refresh promise
- Refresh failure on a public route → silent (no redirect)
- `refetchOnWindowFocus: false`; stale token caught lazily on next request

---

## §5 Feature pages

### Employees (`/employees`, `/employees/:id`, `/employees/new`)

- `EmployeesPage` reads `useParams().id` and `useSearchParams()` for filters; drawer opens iff `id` present
- `EmployeeFilters`: search input (debounced 300ms), department `<select>` (`useDepartmentsQuery`), status `<select>`, sort dropdown
- `EmployeeTable`: virtualized via `@tanstack/react-virtual` if `total > 200`, else plain `<table>`. Columns: avatar+name, position, department, employmentType, status, hireDate, salary (renders "—" if null). Row click → `navigate(/employees/${id})`
- `EmployeeDrawer` (right-side slide-in, 480px, escape-to-close):
  - Header: avatar, name, position
  - Sections: Personal, Employment, Compensation (salary or "Hidden" badge), System
  - Edit button (gated by `usePermission('employees:write:any')`) → opens `EmployeeForm` modal
  - Delete button (admin only) → confirm modal → mutation
- `EmployeeForm` (modal):
  - Fields per `EmployeeCreate`/`EmployeeUpdate` schemas
  - Salary section gated by `usePermission('employees:write:salary')`
  - Salary change reveals `<textarea name="reason">` ("≥ 10 chars required")
  - On submit: invalidates `qk.employees.list`, `qk.employees.detail(id)`, `qk.audit.list`
  - 400 with `fields` → `setError` per field

### Departments (`/departments`)

- Single page, no drawer
- Top right: "New department" button (gated by `departments:write:any`)
- Table: name, employee count (lazy fetch if backend lacks `?withCount=1`), createdAt
- Inline rename: click → input → save on Enter/blur → `useUpdateDepartmentMutation`
- Delete → confirm → mutation; 400 `code: 'DEPT_HAS_EMPLOYEES'` → toast "Move employees first"

### Users (`/users`, admin only)

- Table: avatar+email, role badge, status badge, lastLoginAt, mfaEnabled icon
- Filters: search (email), role, status
- Per-row: "Edit" (UserEditModal — change role/status/language), "Force logout" (with confirm)
- `UserEditModal`:
  - Role `<select>`, Status `<select>`, Language `<select>`
  - Mutation invalidates `qk.users.list` + `qk.audit.list`
  - Backend errors (last-admin demote, self-disable) → toasts via 400

### Audit (`/audit`, admin/hr only)

- Filters: action (static `AUDIT_ACTIONS` const), entityType, entityId, date range (client-side filter on `createdAt`)
- Table: timestamp, actor email, action badge, entityType, entityId, expand chevron
- Expand → simple `<pre>` styled (no syntax-highlighter dep)
- Pagination: "Load more" appending pages
- Salary fields show as `[redacted]` natively (server enforces)

### Settings → Profile (`/settings/profile`)

- Three cards stacked:
  1. **Profile info**: read-only email + role badge + `LanguageSwitcher` (PATCH user `{language}`)
  2. **Change password**: RHF `{currentPassword, newPassword, confirmPassword}` → `POST /api/auth/password/change` → on success: toast + force re-login (server revoked tokens) → `signOut()`
  3. **MFA**:
     - If `user.mfaEnabled === false`: "Enable MFA" → `POST /api/auth/mfa/setup/start` → modal shows QR (`qrcode.react`) + manual secret + 6-digit code → `POST /api/auth/mfa/setup/confirm` → recovery codes one-time view (copy/download) → "I've saved them" → refetch me
     - If `user.mfaEnabled === true`: "Disable MFA" → modal asks current password + 6-digit code → `POST /api/auth/mfa/disable`

### Sidebar visibility matrix

| Item        | Required permission                |
|-------------|------------------------------------|
| Employees   | `employees:read:any` (all roles)   |
| Departments | `departments:read:any`             |
| Users       | `users:read:any` (admin)           |
| Audit       | `audit:read` (admin/hr)            |
| Profile     | always                             |

Items missing permission are not rendered (vs disabled).

---

## §6 Testing strategy

**Stack:** Vitest 2 + `@testing-library/react` + `@testing-library/user-event` + `msw`.

### Setup
- `src/test/setup.ts`: `expect.extend(matchers)`, msw `server.listen({ onUnhandledRequest: 'error' })` in `beforeAll`, `server.resetHandlers()` in `afterEach`, `server.close()` in `afterAll`
- `src/test/server.ts`: default handlers covering all `/api/*` endpoints with realistic Phase 1 shapes; per-test `server.use(...)` overrides
- `src/test/utils.tsx`: `renderWithProviders(ui, { route?, user?, queryClient? })` — `MemoryRouter` + `QueryClientProvider` (fresh client per test, retry off) + `AuthProvider` (seeded with optional user) + `I18nextProvider` (sync test bundle) + `<Toaster/>`

### Component-level coverage

- **AuthProvider boot** — `/me` 200 → authenticated; 401 → unauthenticated; no flash (status starts loading)
- **apiClient** — 401 triggers single refresh + retry; second 401 → signs out; in-flight 401s share one refresh; 400 with `fields` → `ApiError.fields`
- **LoginPage** — happy path navigates to `from`; MFA path navigates to `/login/mfa`; invalid creds → toast; disabled-account → toast
- **MfaChallengePage** — submits with mfaToken; success navigates; invalid code → inline error
- **ResetPasswordPage** — 410 → "link expired" + retry link; weak password → inline `fields` error; success → toast + navigate /login
- **AcceptInvitePage** — view shows email/name; expired (410) → empty state; happy path → IssuedTokens → authenticated → navigate /employees
- **RequireAuth / RequirePermission** — unauth redirects with `from`; missing perm → 403 (URL preserved)
- **EmployeesPage** — table renders; filter changes update query key; row click opens drawer (URL → `/employees/:id`); back button closes drawer
- **EmployeeDrawer** — admin sees salary; manager sees salary only for own report (mocked); employee with no perm sees "—"; admin sees Delete; manager doesn't
- **EmployeeForm** — salary change without reason → server 400 → reason field error; with reason → success + invalidates employee + audit queries
- **DepartmentsPage** — create/rename/delete happy paths; delete-with-employees → toast `DEPT_HAS_EMPLOYEES`
- **UsersPage / UserEditModal** — admin can edit; last-admin demote → 400 toast; force-logout calls endpoint
- **AuditPage** — list renders; expand shows JSON; filter narrows; non-admin route guard fires
- **ProfilePage** — change password success triggers signOut; MFA enable: start → QR shown → confirm → recovery codes shown → me refetched

### Manual smoke (instead of e2e)
Load login → sign in as seeded admin → hit each page → change salary → view audit entry redaction as non-admin (logged in as that role).

### Coverage gate
`pnpm --filter web test --coverage` — target ≥80% on `features/` and `shared/api`. No hard CI gate in Plan 2; root `pnpm test` runs both api + web vitest.

---

## §7 Implementation order

1. Scaffold `apps/web` (package.json, tsconfig, vite, vitest, copy styles.css, basic `main.tsx` rendering "hello") + add web build to root scripts + extend CI `test` job
2. `shared/api/client.ts` + `ApiError` + Zod-parse + tests (msw)
3. `AuthProvider` + `useAuth` + boot sequence + tests
4. Routing skeleton + `RequireAuth` + `RequirePermission` + 403/404 pages + tests
5. `Shell`/`Sidebar`/`TopBar` ported from prototype JSX → TSX
6. i18n init + ID/EN bundles + LanguageSwitcher
7. LoginPage + MfaChallengePage + tests
8. Forgot/Reset/Invite pages + tests
9. Departments page (smallest CRUD)
10. Employees feature (page + drawer + form + filters) + tests
11. Users page + edit modal + tests
12. Audit page + tests
13. Settings/Profile + Change Password + MFA setup/disable + tests
14. Polish: empty states, loading skeletons, toast wiring, keyboard nav (Esc closes drawers)
15. CI update — root `pnpm test` runs both packages, plus `pnpm -r build`

---

## §8 Out of scope

- Absence / Payroll / Benefits / Recruiting views (no backend)
- Cmd+K command palette
- Real-time updates / websockets
- Service worker / offline mode
- Storybook
- E2E tests (Playwright)
- Dark/light theme persistence to backend (kept client-side via `localStorage` per prototype)
- Mobile responsive polish beyond prototype's existing CSS (table → cards on small screens deferred)
