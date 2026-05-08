import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { ChangePasswordCard } from './ChangePasswordCard.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ChangePasswordCard', () => {
  it('on success → signs out → navigates to /login', async () => {
    server.use(http.post('/api/auth/password/change', () => HttpResponse.json({ ok: true })));
    renderWithProviders(
      <Routes>
        <Route path="/" element={<ChangePasswordCard />} />
        <Route path="/login" element={<div data-testid="login">login</div>} />
      </Routes>,
    );
    await userEvent.type(screen.getByLabelText(/current password/i), 'old-password-12');
    await userEvent.type(screen.getByLabelText(/new password/i), 'new-password-99');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
  });
});
