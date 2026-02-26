'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { EyeIcon, EyeSlashIcon } from '@/components/icons';


const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;





export default function ResetPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // Watch password for live strength meter
  const watchedPassword = watch('password', '');

  const onSubmit = async (_data: ResetPasswordFormData) => {
    setError(null);
    setIsLoading(true);

    // Simulate async call (no backend)
    await new Promise((resolve) => setTimeout(resolve, 1800));

    // Simulate occasional error for UI demonstration
    // In production, replace with actual API call
    const simulateError = false; // toggle to true to test error state
    if (simulateError) {
      setError('This reset link has expired or is invalid. Please request a new one.');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setIsSubmitted(true);
  };


  const inputClass = (hasError: boolean) =>
    [
      'w-full px-4 py-3 pr-12 border rounded-lg transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
      'dark:bg-gray-700 dark:text-white placeholder-gray-400',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      hasError
        ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/10'
        : 'border-gray-300 dark:border-gray-600',
    ].join(' ');


  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-green-700 dark:text-green-400 mb-2">
            🌾 Harvest Finance
          </h1>
          <p className="text-gray-600 dark:text-gray-300">Empowering farmers through blockchain</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">

          {isSubmitted ? (
            <div className="text-center py-6" role="status" aria-live="polite">
              {/* Animated checkmark circle */}
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <svg
                  className="h-10 w-10 text-green-600 dark:text-green-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-3">
                Password Reset Successful!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                Your password has been updated successfully. You can now log in with your new password.
              </p>

              <Link
                href="/login"
                className="inline-block bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3 px-8 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Go to Login
              </Link>
            </div>

          ) : (
            /* ----------------------------------------------------------------
               FORM STATE
            ---------------------------------------------------------------- */
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-1">
                  Reset Your Password
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Choose a strong new password for your account.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div
                  className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3 items-start"
                  role="alert"
                  aria-live="assertive"
                >
                  <svg className="h-5 w-5 text-red-500 mt-0.5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

                {/* New Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    New Password
                    <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      autoComplete="new-password"
                      aria-required="true"
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? 'password-error' : undefined}
                      disabled={isLoading}
                      placeholder="Enter new password"
                      className={inputClass(!!errors.password)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
                    >
                      {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                  </div>

                  {/* Password strength meter */}
                  <PasswordStrength password={watchedPassword} />

                  {errors.password && (
                    <p id="password-error" className="mt-1.5 text-sm text-red-500 flex items-center gap-1" role="alert">
                      <svg className="h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Confirm New Password
                    <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword')}
                      type={showConfirm ? 'text' : 'password'}
                      id="confirmPassword"
                      autoComplete="new-password"
                      aria-required="true"
                      aria-invalid={!!errors.confirmPassword}
                      aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
                      disabled={isLoading}
                      placeholder="Re-enter new password"
                      className={inputClass(!!errors.confirmPassword)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
                    >
                      {showConfirm ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p id="confirm-error" className="mt-1.5 text-sm text-red-500 flex items-center gap-1" role="alert">
                      <svg className="h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Password requirements hint */}
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-3">
                  <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1.5">
                    Password requirements:
                  </p>
                  <ul className="space-y-0.5" aria-label="Password requirements">
                    {[
                      { test: watchedPassword.length >= 8, label: 'At least 8 characters' },
                      { test: /[A-Z]/.test(watchedPassword), label: 'One uppercase letter' },
                      { test: /[0-9]/.test(watchedPassword), label: 'One number' },
                      { test: /[^A-Za-z0-9]/.test(watchedPassword), label: 'One special character' },
                    ].map(({ test, label }) => (
                      <li key={label} className="flex items-center gap-1.5 text-xs">
                        <svg
                          className={`h-3.5 w-3.5 shrink-0 transition-colors ${test ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'}`}
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          {test ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                          )}
                        </svg>
                        <span className={test ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}>
                          {label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Updating Password…
                    </span>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>

              {/* Back link */}
              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium transition-colors"
                >
                  ← Back to Login
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Built with ❤️ for farmers worldwide
        </p>
      </div>
    </div>
  );
}