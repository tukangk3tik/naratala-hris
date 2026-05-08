import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { MfaCard } from './MfaCard.js';
import { adminUser } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('MfaCard', () => {
  it('enable flow: start → QR → confirm → recovery codes shown', async () => {
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({ user: { ...adminUser, mfaEnabled: false } }),
      ),
      http.post('/api/auth/mfa/setup/start', () =>
        HttpResponse.json({ secret: 'JBSWY3DPEHPK3PXP', otpauthUrl: 'otpauth://test' }),
      ),
      http.post('/api/auth/mfa/setup/confirm', () =>
        HttpResponse.json({ recoveryCodes: ['code-A', 'code-B', 'code-C'] }),
      ),
    );
    renderWithProviders(<MfaCard />);
    await userEvent.click(await screen.findByRole('button', { name: /enable mfa/i }));
    await waitFor(() => expect(screen.getByText(/JBSWY3DPEHPK3PXP/)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/6-digit/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }));
    await waitFor(() => expect(screen.getByTestId('recovery-codes')).toBeInTheDocument());
    expect(screen.getByText('code-A')).toBeInTheDocument();
  });

  it('disable flow requires password + code', async () => {
    let called = false;
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({ user: { ...adminUser, mfaEnabled: true } }),
      ),
      http.post('/api/auth/mfa/disable', () => {
        called = true;
        return HttpResponse.json({ ok: true });
      }),
    );
    renderWithProviders(<MfaCard />);
    await userEvent.click(await screen.findByRole('button', { name: /disable mfa/i }));
    await userEvent.type(screen.getByLabelText(/current password/i), 'p@ssword99');
    await userEvent.type(screen.getByLabelText(/6-digit/i), '654321');
    await userEvent.click(screen.getByRole('button', { name: /confirm disable/i }));
    await waitFor(() => expect(called).toBe(true));
  });
});
