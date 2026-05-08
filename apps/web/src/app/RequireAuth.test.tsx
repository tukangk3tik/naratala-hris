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
