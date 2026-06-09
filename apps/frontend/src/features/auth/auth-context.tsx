'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiRequest } from '@/lib/http-client';
import type { AuthResponse, AuthUser } from '@/types/auth';

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<AuthUser>;
  resendVerificationCode: (email: string) => Promise<string>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<string>;
  logout: () => void;
};

const USER_KEY = 'wcpp_user';
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = window.localStorage.getItem(USER_KEY);

    if (storedUser) {
      setUser(JSON.parse(storedUser) as AuthUser);
    }

    apiRequest<AuthUser>('/auth/me')
      .then((currentUser) => {
        window.localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        setUser(currentUser);
      })
      .catch(() => {
        window.localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const persistSession = useCallback((response: AuthResponse) => {
    window.localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    setUser(response.user);
    return response.user;
  }, []);

  const redirectByRole = useCallback(
    (nextUser: AuthUser) => {
      router.replace(nextUser.role === 'ADMIN' ? '/admin' : '/dashboard');
    },
    [router],
  );

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      const nextUser = persistSession(response);
      redirectByRole(nextUser);
      return nextUser;
    },
    [persistSession, redirectByRole],
  );

  const register = useCallback(async (input: RegisterInput) => {
    await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }, []);

  const verifyEmail = useCallback(
    async (email: string, code: string) => {
      const response = await apiRequest<AuthResponse>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      const nextUser = persistSession(response);
      redirectByRole(nextUser);
      return nextUser;
    },
    [persistSession, redirectByRole],
  );

  const resendVerificationCode = useCallback(async (email: string) => {
    const response = await apiRequest<{ message: string }>(
      '/auth/resend-verification-code',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      },
    );
    return response.message;
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const response = await apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response.message;
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      const response = await apiRequest<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, newPassword }),
      });
      router.replace('/login');
      return response.message;
    },
    [router],
  );

  const logout = useCallback(() => {
    void apiRequest('/auth/logout', { method: 'POST' }).catch(() => null);
    window.localStorage.removeItem(USER_KEY);
    setUser(null);

    if (pathname !== '/dashboard') {
      router.replace('/dashboard');
    }
  }, [pathname, router]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      register,
      verifyEmail,
      resendVerificationCode,
      forgotPassword,
      resetPassword,
      logout,
    }),
    [
      user,
      isLoading,
      login,
      register,
      verifyEmail,
      resendVerificationCode,
      forgotPassword,
      resetPassword,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export function getStoredToken() {
  return null;
}
