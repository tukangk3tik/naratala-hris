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
