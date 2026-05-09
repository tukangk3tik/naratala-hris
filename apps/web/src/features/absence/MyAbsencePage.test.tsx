import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { MyAbsencePage } from './MyAbsencePage.js';
import { sampleRequest } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('MyAbsencePage', () => {
  it('renders balances and requests, cancel button for pending', async () => {
    renderWithProviders(<MyAbsencePage />);
    await waitFor(() => expect(screen.getAllByText('vacation').length).toBeGreaterThan(0));
    expect(screen.getByText(/2026-06-01/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('cancel approved-past surfaces server toast', async () => {
    server.use(
      http.get('/api/absence/requests', () =>
        HttpResponse.json({
          data: [{ ...sampleRequest, status: 'approved', fromDate: '2099-01-01', toDate: '2099-01-01' }],
          page: 1,
          pageSize: 50,
          total: 1,
        }),
      ),
      http.post('/api/absence/requests/:id/cancel', () =>
        HttpResponse.json(
          { code: 'VALIDATION_FAILED', message: 'LEAVE_ALREADY_STARTED: already started' },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<MyAbsencePage />);
    await waitFor(() => expect(screen.getAllByText('vacation').length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    await waitFor(() => expect(screen.getByText(/already started/i)).toBeInTheDocument());
  });
});
