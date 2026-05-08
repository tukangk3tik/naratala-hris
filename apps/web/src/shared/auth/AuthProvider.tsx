import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { UserDTO } from '@naratala/shared';
import { z } from 'zod';
import { apiFetch, configureClient } from '../api/client.js';
import { tokenStore } from '../api/tokenStore.js';
import { AuthContext, type AuthStatus } from './useAuth.js';

const MeResponse = z.object({
  user: z.object({
    id: z.number(),
    email: z.string(),
    role: z.enum(['admin', 'hr', 'manager', 'employee']),
    status: z.enum(['pending', 'active', 'disabled']),
    language: z.enum(['id', 'en']),
    mfaEnabled: z.boolean(),
    mustChangePassword: z.boolean(),
    lastLoginAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserDTO | null>(null);

  const signOut = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    tokenStore.set(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const r = await apiFetch('/api/auth/me', { schema: MeResponse });
      setUser(r.user as UserDTO);
      setStatus('authenticated');
    } catch {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const setAuth = useCallback((v: { user: UserDTO; accessToken: string }) => {
    tokenStore.set(v.accessToken);
    setUser(v.user);
    setStatus('authenticated');
  }, []);

  useEffect(() => {
    configureClient({ onSignOut: () => void signOut() });
  }, [signOut]);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const value = useMemo(
    () => ({ status, user, setAuth, signOut, refreshMe }),
    [status, user, setAuth, signOut, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
