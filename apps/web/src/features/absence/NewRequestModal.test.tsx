import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { NewRequestModal } from './NewRequestModal.js';
import { sampleRequest } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('NewRequestModal', () => {
  it('submits and closes on success', async () => {
    let seen: { leaveType?: string; fromDate?: string; toDate?: string } | null = null;
    server.use(
      http.post('/api/absence/requests', async ({ request }) => {
        seen = (await request.json()) as { leaveType?: string; fromDate?: string; toDate?: string };
        return HttpResponse.json({ ...sampleRequest, ...seen }, { status: 201 });
      }),
    );
    let closed = false;
    renderWithProviders(<NewRequestModal onClose={() => (closed = true)} />);
    await userEvent.selectOptions(screen.getByLabelText(/leave type/i), 'vacation');
    await userEvent.type(screen.getByLabelText(/^from$/i), '2026-06-01');
    await userEvent.type(screen.getByLabelText(/^to$/i), '2026-06-05');
    await userEvent.type(screen.getByLabelText(/reason/i), 'trip');
    await userEvent.click(screen.getByRole('button', { name: /submit|kirim/i }));
    await waitFor(() => expect(closed).toBe(true));
    expect(seen!.leaveType).toBe('vacation');
  });

  it('shows server validation error (zero days)', async () => {
    server.use(
      http.post('/api/absence/requests', () =>
        HttpResponse.json(
          { code: 'VALIDATION_FAILED', message: 'zero working days in range' },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<NewRequestModal onClose={() => {}} />);
    await userEvent.selectOptions(screen.getByLabelText(/leave type/i), 'vacation');
    await userEvent.type(screen.getByLabelText(/^from$/i), '2026-06-06');
    await userEvent.type(screen.getByLabelText(/^to$/i), '2026-06-07');
    await userEvent.click(screen.getByRole('button', { name: /submit|kirim/i }));
    await waitFor(() => expect(screen.getByText(/zero working days/i)).toBeInTheDocument());
  });
});
