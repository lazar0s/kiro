/**
 * Authentication context and provider for the Laundry Dashboard.
 *
 * Stores user info + tokens in React state (in-memory).
 * The refresh token is persisted in sessionStorage for recovery across page
 * reloads — it's the only token stored outside of memory.
 *
 * Exports: AuthProvider (wrap your app), useAuth() hook.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserRole } from '@laundry/shared';
import { setTokens, clearTokens } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  locationId: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Attempt silent refresh on mount using sessionStorage refresh token
  useEffect(() => {
    const stored = sessionStorage.getItem('refreshToken');
    if (!stored) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const tryRefresh = async (): Promise<void> => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: stored }),
        });

        if (!res.ok) throw new Error('refresh failed');

        const data = await res.json();
        if (cancelled) return;

        setTokens(data.accessToken, data.refreshToken);
        sessionStorage.setItem('refreshToken', data.refreshToken);
        setUser(data.user);
      } catch {
        // Refresh failed — clear stale token
        sessionStorage.removeItem('refreshToken');
        clearTokens();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void tryRefresh();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || 'Invalid credentials');
    }

    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    sessionStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // Best-effort; continue clearing local state
    }
    clearTokens();
    sessionStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
