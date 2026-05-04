import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './RequireAuth.js';
import { RequirePermission } from './RequirePermission.js';
import { NotFound } from './NotFound.js';
import { Shell } from '../shared/ui/Shell.js';

function Placeholder({ name }: { name: string }) {
  return <div data-testid={`page-${name}`}>{name}</div>;
}

export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<Placeholder name="login" />} />
      <Route path="/login/mfa" element={<Placeholder name="mfa" />} />
      <Route path="/password/forgot" element={<Placeholder name="forgot" />} />
      <Route path="/password/reset" element={<Placeholder name="reset" />} />
      <Route path="/invite/accept" element={<Placeholder name="invite" />} />
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route index element={<Navigate to="/employees" replace />} />
          <Route path="/employees" element={<Placeholder name="employees" />} />
          <Route path="/employees/:id" element={<Placeholder name="employees" />} />
          <Route path="/departments" element={<Placeholder name="departments" />} />
          <Route
            path="/users"
            element={
              <RequirePermission perm="users:read">
                <Placeholder name="users" />
              </RequirePermission>
            }
          />
          <Route
            path="/audit"
            element={
              <RequirePermission perm="audit:read">
                <Placeholder name="audit" />
              </RequirePermission>
            }
          />
          <Route path="/settings/profile" element={<Placeholder name="profile" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
