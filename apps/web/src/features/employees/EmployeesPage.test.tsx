import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { EmployeesPage } from './EmployeesPage.js';
import { sampleEmployee } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('EmployeesPage', () => {
  it('renders rows and opens drawer on row click', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/employees/:id" element={<EmployeesPage />} />
      </Routes>,
      { route: '/employees' },
    );
    await waitFor(() => expect(screen.getByText(sampleEmployee.fullName)).toBeInTheDocument());
    await userEvent.click(screen.getByText(sampleEmployee.fullName));
    await waitFor(() => expect(screen.getByRole('complementary')).toBeInTheDocument());
  });

  it('search filter triggers a refetch with q parameter', async () => {
    const seen: string[] = [];
    server.use(
      http.get('/api/employees', ({ request }) => {
        const url = new URL(request.url);
        seen.push(url.searchParams.get('q') ?? '');
        return HttpResponse.json({ data: [sampleEmployee], page: 1, pageSize: 25, total: 1 });
      }),
    );
    renderWithProviders(
      <Routes>
        <Route path="/employees" element={<EmployeesPage />} />
      </Routes>,
      { route: '/employees' },
    );
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    await userEvent.type(screen.getByLabelText(/search/i), 'sample');
    await waitFor(() => expect(seen.some((s) => s === 'sample')).toBe(true), { timeout: 1500 });
  });
});
