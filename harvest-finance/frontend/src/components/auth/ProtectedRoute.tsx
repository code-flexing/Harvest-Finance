'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, hydrate } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    hydrate();
    setIsChecking(false);
  }, [hydrate]);

  useEffect(() => {
    if (!isChecking && !isAuthenticated) {
      router.push('/login');
    }
  }, [isChecking, isAuthenticated, router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
