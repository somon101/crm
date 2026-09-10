import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient, AUTH_EXPIRED_EVENT, refreshSession } from './api-client';
import { setAccessToken } from './token-store';
import type { SafeUser } from '../types';

interface AuthContextValue {
  user: SafeUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        // Goes through the shared coalesced refreshSession() (not a direct
        // apiClient call) so StrictMode's double-mount doesn't fire two
        // concurrent refreshes against the same not-yet-rotated cookie.
        const { user } = await refreshSession();
        if (!cancelled) setUser(user);
      } catch {
        // No valid session (never logged in, or offline with no cached session) —
        // this is expected, not an error to surface.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  async function login(email: string, password: string) {
    const res = await apiClient.post<{ accessToken: string; user: SafeUser }>('/auth/login', {
      email,
      password,
    });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
  }

  async function logout() {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
