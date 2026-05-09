import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { CalendarPage } from './CalendarPage.js';
import { screen, waitFor } from '@testing-library/react';

describe('CalendarPage', () => {
  it('shows employee names on the day cell their absence covers', async () => {
    server.use(
      http.get('/api/absence/requests', () =>
        HttpResponse.json({
          data: [
            {
              id: 1,
              employeeId: 10,
              employeeName: 'Sample Person',
              actorUserId: 1,
              leaveType: 'vacation',
              fromDate: `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}-15`,
              toDate: `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}-15`,
              days: '1.00',
              reason: null,
              status: 'approved',
              decidedByUserId: null,
              decidedAt: null,
              decisionNote: null,
              cancelledByUserId: null,
              cancelledAt: null,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          page: 1,
          pageSize: 200,
          total: 1,
        }),
      ),
    );
    renderWithProviders(<CalendarPage />);
    await waitFor(() => expect(screen.getByText(/Sample Person/)).toBeInTheDocument());
  });
});
