import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { DepartmentsPage } from './DepartmentsPage.js';
import { dept } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('DepartmentsPage', () => {
  it('lists departments', async () => {
    renderWithProviders(<DepartmentsPage />);
    await waitFor(() => expect(screen.getByText(dept.name)).toBeInTheDocument());
  });

  it('creates a new department', async () => {
    let stored = [dept];
    server.use(
      http.get('/api/departments', () => HttpResponse.json({ data: stored })),
      http.post('/api/departments', async ({ request }) => {
        const body = (await request.json()) as { name: string };
        const newDept = { ...dept, id: 99, name: body.name };
        stored = [...stored, newDept];
        return HttpResponse.json(newDept, { status: 201 });
      }),
    );
    renderWithProviders(<DepartmentsPage />);
    await waitFor(() => expect(screen.getByText(dept.name)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /new department|buat/i }));
    await userEvent.type(screen.getByLabelText(/name/i), 'Finance');
    await userEvent.click(screen.getByRole('button', { name: /^create$|^buat$|^save$/i }));
    await waitFor(() => expect(screen.getByText('Finance')).toBeInTheDocument());
  });

  it('delete-with-employees → toast with code', async () => {
    server.use(
      http.delete('/api/departments/:id', () =>
        HttpResponse.json(
          { code: 'DEPT_HAS_EMPLOYEES', message: 'Move employees first' },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<DepartmentsPage />);
    await waitFor(() => expect(screen.getByText(dept.name)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /delete|hapus/i }));
    await userEvent.click(screen.getByRole('button', { name: /^yes$|^ya$|confirm/i }));
    await waitFor(() => expect(screen.getByText(/move employees first/i)).toBeInTheDocument());
  });
});
