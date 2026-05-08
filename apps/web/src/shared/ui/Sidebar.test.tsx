import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { renderWithProviders } from '../../test/utils.js';
import { Sidebar } from './Sidebar.js';
import { adminUser, employeeUser, hrUser } from '../../test/fixtures.js';
import { screen, waitFor } from '@testing-library/react';

describe('Sidebar', () => {
  it('admin sees all items', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ user: adminUser })));
    renderWithProviders(<Sidebar />);
    await waitFor(() => expect(screen.getByRole('link', { name: /employees/i })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /departments/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /audit/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
  });

  it('employee sees employees + departments + profile (no users, no audit)', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ user: employeeUser })));
    renderWithProviders(<Sidebar />);
    await waitFor(() => expect(screen.getByRole('link', { name: /employees/i })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /departments/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /audit/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
  });

  it('hr sees employees + departments + profile (no users, no audit)', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ user: hrUser })));
    renderWithProviders(<Sidebar />);
    await waitFor(() => expect(screen.getByRole('link', { name: /employees/i })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /departments/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /audit/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
  });
});
