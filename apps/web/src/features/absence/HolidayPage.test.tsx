import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { HolidayPage } from './HolidayPage.js';
import { sampleHoliday } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('HolidayPage', () => {
  it('lists holidays and creates a new one', async () => {
    let stored = [sampleHoliday];
    server.use(
      http.get('/api/holidays', () => HttpResponse.json({ data: stored })),
      http.post('/api/holidays', async ({ request }) => {
        const body = (await request.json()) as { date: string; label: string; recurringAnnually?: boolean };
        const next = { ...sampleHoliday, id: 99, ...body };
        stored = [...stored, next];
        return HttpResponse.json(next, { status: 201 });
      }),
    );
    renderWithProviders(<HolidayPage />);
    await waitFor(() => expect(screen.getByText(sampleHoliday.label)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/^date$/i), '2026-12-25');
    await userEvent.type(screen.getByLabelText(/^label$/i), 'Christmas');
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    await waitFor(() => expect(screen.getByText('Christmas')).toBeInTheDocument());
  });
});
