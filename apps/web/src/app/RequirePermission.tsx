import type { ReactNode } from 'react';
import type { Permission } from '@naratala/shared';
import { useAuth } from '../shared/auth/useAuth.js';
import { usePermission } from '../shared/permissions/usePermission.js';
import { FullPageSpinner } from '../shared/ui/FullPageSpinner.js';
import { Forbidden } from './Forbidden.js';

export function RequirePermission({
  perm,
  children,
}: {
  perm: Permission;
  children: ReactNode;
}): JSX.Element {
  const { status } = useAuth();
  const ok = usePermission(perm);
  if (status === 'loading') return <FullPageSpinner />;
  if (!ok) return <Forbidden />;
  return <>{children}</>;
}
