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
      { route: '/login/mfa', routeState: { mfaToken: 'mfa-tok', from: '/employees' } },
    );
    await userEvent.type(screen.getByLabelText(/code|kode/i), '123456');
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
    await userEvent.type(screen.getByLabelText(/code|kode/i), '111111');
    await userEvent.click(screen.getByRole('button', { name: /verify|verifikasi/i }));
    await waitFor(() => expect(screen.getByText(/bad code/i)).toBeInTheDocument());
  });
});
