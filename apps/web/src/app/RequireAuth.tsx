import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../shared/auth/useAuth.js';
import { FullPageSpinner } from '../shared/ui/FullPageSpinner.js';

export function RequireAuth(): JSX.Element {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'unauthenticated')
    return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
