import { http, HttpResponse } from 'msw';
import { adminUser, dept, sampleEmployee, sampleRequest, sampleBalances, sampleHoliday, samplePolicies } from './fixtures.js';

export const defaultHandlers = [
  http.get('/api/auth/me', () => HttpResponse.json({ user: adminUser })),
  http.post('/api/auth/login', () =>
    HttpResponse.json({ accessToken: 'test-access', user: adminUser }),
  ),
  http.post('/api/auth/refresh', () =>
    HttpResponse.json({ accessToken: 'refreshed', user: adminUser }),
  ),
  http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/departments', () => HttpResponse.json({ data: [dept] })),
  http.get('/api/employees', () =>
    HttpResponse.json({ data: [sampleEmployee], page: 1, pageSize: 25, total: 1 }),
  ),
  http.get('/api/employees/:id', ({ params }) =>
    HttpResponse.json({ ...sampleEmployee, id: Number(params['id']) }),
  ),
  http.get('/api/users', () =>
    HttpResponse.json({ data: [adminUser], page: 1, pageSize: 25, total: 1 }),
  ),
  http.get('/api/audit', () =>
    HttpResponse.json({ data: [], page: 1, pageSize: 25, total: 0 }),
  ),
  http.get('/api/absence/requests', () =>
    HttpResponse.json({ data: [sampleRequest], page: 1, pageSize: 25, total: 1 }),
  ),
  http.get('/api/absence/requests/balances', () => HttpResponse.json({ data: sampleBalances })),
  http.get('/api/holidays', () => HttpResponse.json({ data: [sampleHoliday] })),
  http.get('/api/leave-policies', () => HttpResponse.json({ data: samplePolicies })),
  http.get('/api/working-schedule', () =>
    HttpResponse.json({ defaultWorkingDays: 62, perEmployeeOverrides: [] }),
  ),
];
