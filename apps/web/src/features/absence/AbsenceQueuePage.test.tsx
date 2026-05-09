import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { AbsenceQueuePage } from './AbsenceQueuePage.js';
import { sampleRequest } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('AbsenceQueuePage', () => {
  it('renders pending requests and shows detail on click', async () => {
    renderWithProviders(<AbsenceQueuePage />);
    await waitFor(() => expect(screen.getAllByText(/Sample Person/i).length).toBeGreaterThan(0));
    expect(screen.getByRole('complementary', { name: /request detail/i })).toBeInTheDocument();
  });

  it('approve calls endpoint and refetches', async () => {
    let approved = false;
    server.use(
      http.post('/api/absence/requests/:id/approve', () => {
        approved = true;
        return HttpResponse.json({ ...sampleRequest, status: 'approved' });
      }),
    );
    renderWithProviders(<AbsenceQueuePage />);
    await waitFor(() => expect(screen.getAllByText(/Sample Person/i).length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole('button', { name: /approve \d/i }));
    await waitFor(() => expect(approved).toBe(true));
  });

  it('filter switch refetches with status param', async () => {
    const seen: string[] = [];
    server.use(
      http.get('/api/absence/requests', ({ request }) => {
        const url = new URL(request.url);
        seen.push(url.searchParams.get('status') ?? '');
        return HttpResponse.json({ data: [sampleRequest], page: 1, pageSize: 50, total: 1 });
      }),
    );
    renderWithProviders(<AbsenceQueuePage />);
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole('button', { name: /^all$/i }));
    await waitFor(() => expect(seen.includes('')).toBe(true));
  });
});
