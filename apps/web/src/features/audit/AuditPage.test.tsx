import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { AuditPage } from './AuditPage.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const entry = {
  id: 1,
  actorEmail: 'admin@naratala.local',
  action: 'employee.update',
  entityType: 'employee',
  entityId: 10,
  before: { salaryAmount: '15000000.00' },
  after: { salaryAmount: '20000000.00' },
  createdAt: '2026-04-28T10:00:00.000Z',
};

describe('AuditPage', () => {
  it('renders entries and toggles JSON detail', async () => {
    server.use(
      http.get('/api/audit', () =>
        HttpResponse.json({ data: [entry], page: 1, pageSize: 50, total: 1 }),
      ),
    );
    renderWithProviders(<AuditPage />);
    await waitFor(() => expect(screen.getByText(entry.actorEmail)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /show/i }));
    expect(screen.getByText(/20000000\.00/)).toBeInTheDocument();
  });

  it('filter changes refetch with action param', async () => {
    const seen: string[] = [];
    server.use(
      http.get('/api/audit', ({ request }) => {
        const url = new URL(request.url);
        seen.push(url.searchParams.get('action') ?? '');
        return HttpResponse.json({ data: [], page: 1, pageSize: 50, total: 0 });
      }),
    );
    renderWithProviders(<AuditPage />);
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    await userEvent.selectOptions(screen.getByLabelText(/action/i), 'employee.update');
    await waitFor(() => expect(seen.includes('employee.update')).toBe(true));
  });
});
