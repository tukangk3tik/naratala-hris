import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils.js';
import { PayrollDashboardPage } from './PayrollDashboardPage.js';

describe('PayrollDashboardPage', () => {
  it('renders summary month label and dept name', async () => {
    renderWithProviders(<PayrollDashboardPage />);
    await waitFor(() => expect(screen.getByText('May 2026 Monthly')).toBeInTheDocument());
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  it('renders upcoming runs section', async () => {
    renderWithProviders(<PayrollDashboardPage />);
    await waitFor(() => expect(screen.getByText(/upcoming/i)).toBeInTheDocument());
  });
});
