import { createContext, useContext } from 'react';
import type { UserDTO } from '@naratala/shared';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthValue {
  status: AuthStatus;
  user: UserDTO | null;
  setAuth: (v: { user: UserDTO; accessToken: string }) => void;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
