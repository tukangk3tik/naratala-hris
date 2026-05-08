import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { EmployeeForm } from './EmployeeForm.js';
import { sampleEmployee } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('EmployeeForm', () => {
  it('changing salary without reason triggers server validation, surfaces field error', async () => {
    server.use(
      http.patch('/api/employees/:id', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_FAILED',
            message: 'invalid',
            details: { fields: { reason: ['reason (≥10 chars) is required'] } },
          },
          { status: 400 },
        ),
      ),
    );
    const onClose = () => {};
    renderWithProviders(<EmployeeForm employee={sampleEmployee} onClose={onClose} />);
    const salary = await screen.findByLabelText(/salary/i);
    await userEvent.clear(salary);
    await userEvent.type(salary, '20000000.00');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() =>
      expect(screen.getByText(/reason \(≥10 chars\)/i)).toBeInTheDocument(),
    );
  });

  it('with reason ≥10 chars succeeds', async () => {
    let seenBody: { reason?: string; salaryAmount?: string } | null = null;
    server.use(
      http.patch('/api/employees/:id', async ({ request }) => {
        seenBody = (await request.json()) as { reason?: string; salaryAmount?: string };
        return HttpResponse.json({ ...sampleEmployee, salaryAmount: seenBody.salaryAmount ?? null });
      }),
    );
    let closed = false;
    renderWithProviders(
      <EmployeeForm employee={sampleEmployee} onClose={() => (closed = true)} />,
    );
    const salary = await screen.findByLabelText(/salary/i);
    await userEvent.clear(salary);
    await userEvent.type(salary, '20000000.00');
    const reason = await screen.findByLabelText(/reason/i);
    await userEvent.type(reason, 'annual review increase');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(closed).toBe(true));
    expect(seenBody!.reason).toMatch(/annual/);
  });
});
