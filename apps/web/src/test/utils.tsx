import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';
import { makeQueryClient } from '../shared/api/queries.js';
import { AuthProvider } from '../shared/auth/AuthProvider.js';
import { Toaster } from 'sonner';

interface Opts extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  opts: Opts = {},
): RenderResult & { client: QueryClient } {
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
