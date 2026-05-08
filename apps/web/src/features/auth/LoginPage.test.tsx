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
    await userEvent.type(screen.getByLabelText(/password|kata sandi/i), 'correct-horse-12');
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
    await userEvent.type(screen.getByLabelText(/password|kata sandi/i), 'correct-horse-12');
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
    await userEvent.type(screen.getByLabelText(/password|kata sandi/i), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: /sign in|masuk/i }));
    await waitFor(() => expect(screen.getByText(/invalid/i)).toBeInTheDocument());
  });
});
