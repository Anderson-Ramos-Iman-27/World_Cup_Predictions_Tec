'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import type { UserRole } from '@/types/auth';

type PrivateRouteProps = {
  children: React.ReactNode;
  role?: UserRole;
};

export function PrivateRoute({ children, role }: PrivateRouteProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (role && user.role !== role) {
      router.replace(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    }
  }, [isLoading, role, router, user]);

  if (isLoading || !user || (role && user.role !== role)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-600">
        Cargando sesion...
      </main>
    );
  }

  return <>{children}</>;
}
