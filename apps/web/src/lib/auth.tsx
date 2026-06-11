'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAccessToken } from './api';
import type { AuthUser } from './types';

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // attempt silent refresh on mount
  useEffect(() => {
    (async () => {
      try {
        const { accessToken } = await api<{ accessToken: string }>('/auth/refresh', {
          method: 'POST', auth: false,
        });
        setAccessToken(accessToken);
        const me = await api<AuthUser>('/users/me');
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken, user } = await api<{ accessToken: string; user: AuthUser }>(
      '/auth/login',
      { method: 'POST', auth: false, body: JSON.stringify({ email, password }) },
    );
    setAccessToken(accessToken);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST', auth: false }).catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles: string[]) => !!user && roles.some((r) => user.roles.includes(r)),
    [user],
  );

  return (
    <Ctx.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
