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
