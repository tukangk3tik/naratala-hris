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
