'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthShell } from '@/components/auth/AuthShell';
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

const requirementChecks = (password: string) => [
  { test: password.length >= 8, label: 'At least 8 characters' },
  { test: /[A-Z]/.test(password), label: 'One uppercase letter' },
  { test: /[0-9]/.test(password), label: 'One number' },
  { test: /[^A-Za-z0-9]/.test(password), label: 'One special character' },
];

export default function ResetPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = useWatch({ control, name: 'password', defaultValue: '' });

  const onSubmit = async () => {
    setError(null);
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1800));
    setIsLoading(false);
    setIsSubmitted(true);
  };

  return (
    <AuthShell
      title={isSubmitted ? 'Password updated' : 'Choose a new password'}
      subtitle={
        isSubmitted
          ? 'Your password has been reset. Sign in again to continue managing orders and settlements.'
          : 'Create a strong password that keeps your financing activity and order data secure.'
      }
      footer={
        <p>
          Need to restart the flow?{' '}
          <Link href="/forgot-password" className="inline-link">
            Request another reset link
          </Link>
        </p>
      }
    >
      {isSubmitted ? (
        <div className="space-y-5">
          <div className="status-banner status-banner--success" role="status" aria-live="polite">
            <p>Your password has been updated successfully.</p>
          </div>
          <Link href="/login" className="btn-primary">
            Return to sign in
          </Link>
        </div>
      ) : (
        <>
          {error ? (
            <div className="status-banner status-banner--error mb-5" role="alert" aria-live="assertive">
              <p>{error}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label htmlFor="password" className="field-label">
                New password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : 'password-strength'}
                  disabled={isLoading}
                  placeholder="Create a secure password"
                  className="input-field pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="password-toggle"
                >
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
              <div id="password-strength">
                <PasswordStrength password={password} />
              </div>
              {errors.password ? (
                <p id="password-error" className="mt-2 text-sm text-red-600" role="alert">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="field-label">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  id="confirmPassword"
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
                  disabled={isLoading}
                  placeholder="Repeat the new password"
                  className="input-field pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((value) => !value)}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  className="password-toggle"
                >
                  {showConfirm ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.confirmPassword ? (
                <p id="confirm-error" className="mt-2 text-sm text-red-600" role="alert">
                  {errors.confirmPassword.message}
                </p>
              ) : null}
            </div>

            <div className="rounded-[20px] border border-[rgba(47,122,66,0.14)] dark:border-[rgba(141,187,85,0.18)] bg-[#f4faf0] dark:bg-[#162a1a] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(47,122,66,0.1)] dark:border-[rgba(141,187,85,0.1)]">
                <p className="text-sm font-semibold text-slate-800 dark:text-gray-100">Password requirements</p>
                <span className="text-xs font-medium tabular-nums text-slate-500 dark:text-gray-400">
                  {requirementChecks(password).filter((r) => r.test).length}
                  <span className="text-slate-300 dark:text-gray-600 mx-0.5">/</span>
                  {requirementChecks(password).length} met
                </span>
              </div>
              <ul className="px-4 py-3 space-y-2.5" aria-label="Password requirements">
                {requirementChecks(password).map(({ test, label }) => (
                  <li key={label} className="flex items-center gap-2.5 text-sm transition-all duration-200">
                    <span
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 ${
                        test
                          ? 'bg-[var(--brand-soft)] dark:bg-[rgba(74,222,128,0.15)] text-[var(--brand-strong)] dark:text-[#4ade80]'
                          : 'bg-slate-200/70 dark:bg-[#1a3020] text-slate-400 dark:text-gray-600'
                      }`}
                    >
                      {test ? '✓' : '–'}
                    </span>
                    <span
                      className={`transition-colors duration-200 ${
                        test
                          ? 'text-slate-800 dark:text-gray-100 font-medium'
                          : 'text-slate-400 dark:text-gray-500'
                      }`}
                    >
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <button type="submit" disabled={isLoading} aria-busy={isLoading} className="btn-primary">
              {isLoading ? 'Updating password...' : 'Update password'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
