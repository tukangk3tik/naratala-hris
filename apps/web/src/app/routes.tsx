import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './RequireAuth.js';
import { RequirePermission } from './RequirePermission.js';
import { NotFound } from './NotFound.js';
import { Shell } from '../shared/ui/Shell.js';
import { LoginPage } from '../features/auth/LoginPage.js';
import { MfaChallengePage } from '../features/auth/MfaChallengePage.js';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage.js';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage.js';
import { AcceptInvitePage } from '../features/auth/AcceptInvitePage.js';
import { DepartmentsPage } from '../features/departments/DepartmentsPage.js';
import { EmployeesPage } from '../features/employees/EmployeesPage.js';
import { UsersPage } from '../features/users/UsersPage.js';
import { AuditPage } from '../features/audit/AuditPage.js';
import { ProfilePage } from '../features/settings/ProfilePage.js';

export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/mfa" element={<MfaChallengePage />} />
      <Route path="/password/forgot" element={<ForgotPasswordPage />} />
      <Route path="/password/reset" element={<ResetPasswordPage />} />
      <Route path="/invite/accept" element={<AcceptInvitePage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route index element={<Navigate to="/employees" replace />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/:id" element={<EmployeesPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route
            path="/users"
            element={
              <RequirePermission perm="users:read">
                <UsersPage />
              </RequirePermission>
            }
          />
          <Route
            path="/audit"
            element={
              <RequirePermission perm="audit:read">
                <AuditPage />
              </RequirePermission>
            }
          />
          <Route path="/settings/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
