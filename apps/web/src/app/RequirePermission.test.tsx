import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Routes, Route } from 'react-router-dom';
import { server } from '../test/server.js';
import { renderWithProviders } from '../test/utils.js';
import { RequirePermission } from './RequirePermission.js';
import { Forbidden } from './Forbidden.js';
import { screen, waitFor } from '@testing-library/react';
import { employeeUser } from '../test/fixtures.js';

function Allowed() {
  return <div>allowed</div>;
}

describe('RequirePermission', () => {
  it('renders children when permitted', async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/x"
          element={
            <RequirePermission perm="audit:read">
              <Allowed />
            </RequirePermission>
          }
        />
      </Routes>,
      { route: '/x' },
    );
    await waitFor(() => expect(screen.getByText('allowed')).toBeInTheDocument());
  });

  it('renders Forbidden when not permitted', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ user: employeeUser })));
    renderWithProviders(
      <Routes>
        <Route
          path="/x"
          element={
            <RequirePermission perm="audit:read">
              <Allowed />
            </RequirePermission>
          }
        />
      </Routes>,
      { route: '/x' },
    );
    await waitFor(() => expect(screen.getByTestId('forbidden-page')).toBeInTheDocument());
  });
});

// suppress unused import warning
void Forbidden;
