import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { buildApp } from '../app.js';
import { createTestDb, type TestDb } from './db.js';
import { loadEnv } from '../shared/config/env.js';
import { hashPassword } from '../modules/auth/password.js';
import { departments, employees, users } from '../shared/db/schema.js';
import type { Role } from '@naratala/shared';

type Expectation = 'allow' | 'forbid';
interface Case {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  role: Role;
  expect: Expectation;
  body?: Record<string, unknown>;
}

describe('permission matrix', () => {
  let ctx: TestDb;
  let app: ReturnType<typeof buildApp>;
  const logins: Partial<Record<Role, string>> = {};
  let employeeId = 0;
  let inviteeId = 0;

  beforeAll(async () => {
    ctx = await createTestDb();
    process.env.WEB_ORIGIN = 'http://localhost:5173';
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(86);
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = '1025';
    process.env.MAIL_FROM = 'Naratala <n@x.co>';
    process.env.INITIAL_ADMIN_EMAIL = 'a@b.co';
    process.env.INITIAL_ADMIN_PASSWORD = 'dev-password-12';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'mysql://naratala:dev@127.0.0.1:3306/naratala';
    const env = loadEnv();
    app = buildApp({ env, db: ctx.db });

    const hash = await hashPassword('correct-horse-12');
    for (const role of ['admin', 'hr', 'manager', 'employee'] as const) {
      await ctx.db.insert(users).values({
        email: `${role}@naratala.local`,
        passwordHash: hash,
        role,
        status: 'active',
      });
    }
    const [dep] = await ctx.db.insert(departments).values({ name: 'Eng' }).$returningId();
    const [emp] = await ctx.db
      .insert(employees)
      .values({
        fullName: 'Target Person',
        email: 'target@naratala.local',
        departmentId: dep!.id,
        position: 'Engineer',
        employmentType: 'full_time',
        hireDate: '2024-01-01',
        avatarColorHue: 10,
      })
      .$returningId();
    employeeId = emp!.id;
    const [invitee] = await ctx.db
      .insert(employees)
      .values({
        fullName: 'Invitee Person',
        email: 'invitee@naratala.local',
        departmentId: dep!.id,
        position: 'Engineer',
        employmentType: 'full_time',
        hireDate: '2024-01-01',
        avatarColorHue: 20,
      })
      .$returningId();
    inviteeId = invitee!.id;

    for (const role of ['admin', 'hr', 'manager', 'employee'] as const) {
      const r = await request(app)
        .post('/api/auth/login')
        .send({ email: `${role}@naratala.local`, password: 'correct-horse-12' });
      logins[role] = r.body.accessToken as string;
    }
  });
  afterAll(async () => {
    await ctx.drop();
  });

  function buildCases(): Case[] {
    return [
      { method: 'GET', path: '/api/employees', role: 'employee', expect: 'allow' },
      {
        method: 'POST',
        path: '/api/employees',
        role: 'employee',
        expect: 'forbid',
        body: {
          fullName: 'X',
          email: 'x-emp@x.co',
          departmentId: 1,
          position: 'p',
          employmentType: 'full_time',
          hireDate: '2025-01-01',
        },
      },
      {
        method: 'POST',
        path: '/api/employees',
        role: 'manager',
        expect: 'forbid',
        body: {
          fullName: 'X',
          email: 'x-mgr@x.co',
          departmentId: 1,
          position: 'p',
          employmentType: 'full_time',
          hireDate: '2025-01-01',
        },
      },
      {
        method: 'POST',
        path: '/api/employees',
        role: 'hr',
        expect: 'allow',
        body: {
          fullName: 'X',
          email: 'x-hr@x.co',
          departmentId: 1,
          position: 'p',
          employmentType: 'full_time',
          hireDate: '2025-01-01',
        },
      },
      { method: 'DELETE', path: '/api/employees/__ID__', role: 'hr', expect: 'forbid' },
      { method: 'DELETE', path: '/api/employees/__ID__', role: 'admin', expect: 'allow' },
      { method: 'GET', path: '/api/departments', role: 'employee', expect: 'allow' },
      {
        method: 'POST',
        path: '/api/departments',
        role: 'manager',
        expect: 'forbid',
        body: { name: 'Fin' },
      },
      {
        method: 'POST',
        path: '/api/departments',
        role: 'hr',
        expect: 'allow',
        body: { name: 'Fin' },
      },
      { method: 'GET', path: '/api/users', role: 'hr', expect: 'forbid' },
      { method: 'GET', path: '/api/users', role: 'admin', expect: 'allow' },
      { method: 'GET', path: '/api/audit', role: 'hr', expect: 'forbid' },
      { method: 'GET', path: '/api/audit', role: 'admin', expect: 'allow' },
      {
        method: 'POST',
        path: '/api/invites',
        role: 'manager',
        expect: 'forbid',
        body: { employeeId: -1, role: 'manager' },
      },
      {
        method: 'POST',
        path: '/api/invites',
        role: 'hr',
        expect: 'allow',
        body: { employeeId: -1, role: 'manager' },
      },
    ];
  }

  for (const c of buildCases()) {
    it(`${c.method} ${c.path} as ${c.role} → ${c.expect}`, async () => {
      const path = c.path.replace('__ID__', String(employeeId));
      const body = c.body
        ? { ...c.body, ...(c.body.employeeId === -1 ? { employeeId: inviteeId } : {}) }
        : undefined;
      const tok = logins[c.role]!;
      const r = request(app);
      const method = c.method.toLowerCase() as 'get' | 'post' | 'patch' | 'delete';
      const req = r[method](path).set('Authorization', `Bearer ${tok}`);
      const res = body !== undefined ? await req.send(body) : await req.send();
      if (c.expect === 'allow') {
        expect(res.status).toBeLessThan(400);
      } else {
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('INSUFFICIENT_ROLE');
      }
    });
  }
});
