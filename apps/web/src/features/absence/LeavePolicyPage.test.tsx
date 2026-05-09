import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { LeavePolicyPage } from './LeavePolicyPage.js';
import { samplePolicies } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('LeavePolicyPage', () => {
  it('inline edits a policy and PATCHes', async () => {
    let patched: { defaultDaysPerYear?: number } | null = null;
    server.use(
      http.patch('/api/leave-policies/:id', async ({ request }) => {
        patched = (await request.json()) as { defaultDaysPerYear?: number };
        return HttpResponse.json({ ...samplePolicies[0]!, defaultDaysPerYear: '25.00' });
      }),
    );
    renderWithProviders(<LeavePolicyPage />);
    await waitFor(() => expect(screen.getByText('20.00')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: '20.00' }));
    const input = await screen.findByLabelText(/days for vacation/i);
    await userEvent.clear(input);
    await userEvent.type(input, '25');
    await userEvent.tab();
    await waitFor(() => expect(patched?.defaultDaysPerYear).toBe(25));
  });
});
