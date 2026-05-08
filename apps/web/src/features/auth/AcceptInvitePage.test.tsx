import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { AcceptInvitePage } from './AcceptInvitePage.js';
import { adminUser } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('AcceptInvitePage', () => {
  it('renders invite info and accepts invite → navigates to /employees', async () => {
    server.use(
      http.get('/api/invites/:token', () =>
        HttpResponse.json({
          email: 'new@naratala.local',
          fullName: 'New Hire',
          expiresAt: '2026-12-31T00:00:00.000Z',
        }),
      ),
      http.post('/api/invites/:token/accept', () =>
        HttpResponse.json({ accessToken: 'a-tok', user: adminUser }),
      ),
    );
    renderWithProviders(
      <Routes>
        <Route path="/invite/accept" element={<AcceptInvitePage />} />
        <Route path="/employees" element={<div data-testid="emp">emp</div>} />
      </Routes>,
      { route: '/invite/accept?token=tok-1234567' },
    );
    await waitFor(() => expect(screen.getByText(/new hire/i)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/new password|kata sandi baru/i), 'correct-horse-99');
    await userEvent.type(screen.getByLabelText(/confirm|konfirmasi/i), 'correct-horse-99');
    await userEvent.click(screen.getByRole('button', { name: /save|simpan/i }));
    await waitFor(() => expect(screen.getByTestId('emp')).toBeInTheDocument());
  });

  it('410 → shows expired empty state', async () => {
    server.use(
      http.get('/api/invites/:token', () =>
        HttpResponse.json({ code: 'INVITE_EXPIRED', message: 'gone' }, { status: 410 }),
      ),
    );
    renderWithProviders(
      <Routes>
        <Route path="/invite/accept" element={<AcceptInvitePage />} />
      </Routes>,
      { route: '/invite/accept?token=tok-1234567' },
    );
    await waitFor(() => expect(screen.getByText(/expired/i)).toBeInTheDocument());
  });
});
