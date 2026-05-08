import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { UsersPage } from './UsersPage.js';
import { adminUser } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('UsersPage', () => {
  it('renders rows', async () => {
    renderWithProviders(<UsersPage />);
    await waitFor(() => expect(screen.getByText(adminUser.email)).toBeInTheDocument());
  });

  it('last-admin demote → toast surfaces server message', async () => {
    server.use(
      http.patch('/api/users/:id', () =>
        HttpResponse.json(
          { code: 'VALIDATION_FAILED', message: 'cannot demote last admin' },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<UsersPage />);
    await waitFor(() => expect(screen.getByText(adminUser.email)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await userEvent.selectOptions(screen.getByLabelText(/role/i), 'employee');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(screen.getByText(/cannot demote last admin/i)).toBeInTheDocument());
  });

  it('force logout calls endpoint', async () => {
    let called = false;
    server.use(
      http.post('/api/users/:id/force-logout', () => {
        called = true;
        return HttpResponse.json({ ok: true });
      }),
    );
    renderWithProviders(<UsersPage />);
    await waitFor(() => expect(screen.getByText(adminUser.email)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /force logout/i }));
    await waitFor(() => expect(called).toBe(true));
  });
});
