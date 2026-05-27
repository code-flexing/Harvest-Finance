'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthShell } from '@/components/auth/AuthShell';
import { StellarAuth } from '@/components/auth/StellarAuth';
import { EyeIcon, EyeSlashIcon } from '@/components/icons';
import { useAuthStore } from '@/lib/stores/auth-store';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { ErrorState } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError, isAuthenticated, hydrate } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'stellar'>('email');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    await login(data.email, data.password);
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to review funding activity, track settlement progress, and manage orders across the platform."
      footer={
        <p>
          New to the platform?{' '}
          <Link href="/signup" className="inline-link">
            Create an account
          </Link>
        </p>
      }
    >
      {/* Auth Method Toggle */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setAuthMethod('email')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              authMethod === 'email'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setAuthMethod('stellar')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
              authMethod === 'stellar'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Stellar
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState
          variant="inline"
          title="Sign-in failed"
          description={error}
          className="mb-5"
        />
      ) : null}

      {authMethod === 'email' ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="field-label">
              Email address
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              autoComplete="email"
              aria-required="true"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              disabled={isLoading}
              className="input-field"
              placeholder="farmer@example.com"
            />
            {errors.email ? (
              <p id="email-error" className="mt-2 text-sm text-red-600" role="alert">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="password" className="field-label mb-0">
                Password
              </label>
              <Link href="/forgot-password" className="inline-link text-sm">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                aria-required="true"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                disabled={isLoading}
                className="input-field pr-12"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password ? (
              <p id="password-error" className="mt-2 text-sm text-red-600" role="alert">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <button type="submit" disabled={isLoading} aria-busy={isLoading} className="btn-primary">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      ) : (
        <StellarAuth 
          onSuccess={() => router.push('/')}
          onError={(errorMessage) => {
            // Error is handled by the store
          }}
        />
      )}
    </AuthShell>
  );
}
