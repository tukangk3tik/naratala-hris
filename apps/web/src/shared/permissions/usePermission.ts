import { hasPermission, type Permission } from '@naratala/shared';
import { useAuth } from '../auth/useAuth.js';

export function usePermission(perm: Permission): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return hasPermission(user.role, perm);
}
