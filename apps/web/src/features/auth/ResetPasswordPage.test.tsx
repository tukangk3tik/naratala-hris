import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { ResetPasswordPage } from './ResetPasswordPage.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ResetPasswordPage', () => {
  it('410 expired token → shows expired message', async () => {
    server.use(
      http.post('/api/auth/password/reset', () =>
        HttpResponse.json({ code: 'INVITE_EXPIRED', message: 'expired' }, { status: 410 }),
      ),
    );
    renderWithProviders(
      <Routes>
        <Route path="/password/reset" element={<ResetPasswordPage />} />
      </Routes>,
      { route: '/password/reset?token=abcdefghij' },
    );
    await userEvent.type(screen.getByLabelText(/new password|kata sandi baru/i), 'correct-horse-99');
    await userEvent.type(screen.getByLabelText(/confirm|konfirmasi/i), 'correct-horse-99');
    await userEvent.click(screen.getByRole('button', { name: /save|simpan/i }));
    await waitFor(() => expect(screen.getByText(/expired|kedaluwarsa/i)).toBeInTheDocument());
  });

  it('happy path → navigates to /login', async () => {
    server.use(http.post('/api/auth/password/reset', () => HttpResponse.json({ ok: true })));
    renderWithProviders(
      <Routes>
        <Route path="/password/reset" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div data-testid="login">login</div>} />
      </Routes>,
      { route: '/password/reset?token=abcdefghij' },
    );
    await userEvent.type(screen.getByLabelText(/new password|kata sandi baru/i), 'correct-horse-99');
    await userEvent.type(screen.getByLabelText(/confirm|konfirmasi/i), 'correct-horse-99');
    await userEvent.click(screen.getByRole('button', { name: /save|simpan/i }));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
  });
});
