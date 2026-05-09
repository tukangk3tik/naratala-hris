import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils.js';
import { MyPayslipsPage } from './MyPayslipsPage.js';

describe('MyPayslipsPage', () => {
  it('renders own payslip row', async () => {
    renderWithProviders(<MyPayslipsPage />);
    await waitFor(() => expect(screen.getByText(/payslip #1/i)).toBeInTheDocument());
    expect(screen.getAllByText(/1\.000\.000/).length).toBeGreaterThan(0);
  });
});
