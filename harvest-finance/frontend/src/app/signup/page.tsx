'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { EyeIcon, EyeSlashIcon } from '@/components/icons';
import { useAuthStore } from '@/lib/stores/auth-store';
import { signupSchema, type SignupFormData, type UserRole } from '@/lib/validations/auth';

const roles: { value: UserRole; label: string; icon: string; description: string }[] = [
  { value: 'farmer', label: 'Farmer', icon: 'FM', description: 'Manage crops, orders, and financing requests.' },
  { value: 'buyer', label: 'Buyer', icon: 'BY', description: 'Source produce and follow verified fulfillment updates.' },
  { value: 'inspector', label: 'Inspector', icon: 'IN', description: 'Review compliance and confirm quality checkpoints.' },
];

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading, error, clearError, isAuthenticated, hydrate } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'farmer', agreeToTerms: false as unknown as true },
  });

  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const selectedRole = useWatch({ control, name: 'role', defaultValue: 'farmer' });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: SignupFormData) => {
    clearError();
    await signup(data.name, data.email, data.password, data.role);
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Choose your role and start with a consistent workflow built for agricultural settlements and verification."
      footer={
        <p>
          Already registered?{' '}
          <Link href="/login" className="inline-link">
            Sign in instead
          </Link>
        </p>
      }
    >
      {error ? (
        <div className="status-banner status-banner--error mb-5" role="alert" aria-live="polite">
          <p>{error}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="field-label">
              Full name
            </label>
            <input
              {...register('name')}
              id="name"
              type="text"
              autoComplete="name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
              disabled={isLoading}
              className="input-field"
              placeholder="Amina Yusuf"
            />
            {errors.name ? (
              <p id="name-error" className="mt-2 text-sm text-red-600" role="alert">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="email" className="field-label">
              Email address
            </label>
            <input
              {...register('email')}
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              disabled={isLoading}
              className="input-field"
              placeholder="team@farmco.com"
            />
            {errors.email ? (
              <p id="email-error" className="mt-2 text-sm text-red-600" role="alert">
                {errors.email.message}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="field-label">Select your role</label>
          <div className="grid gap-3 sm:grid-cols-3">
            {roles.map((role) => {
              const selected = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setValue('role', role.value, { shouldValidate: true })}
                  disabled={isLoading}
                  aria-pressed={selected}
                  className={`role-card ${selected ? 'role-card--active' : 'role-card--idle'}`}
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white dark:bg-[#0d1f12] text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)] shadow-sm">
                    {role.icon}
                  </span>
                  <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{role.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-gray-400">{role.description}</p>
                </button>
              );
            })}
          </div>
          {errors.role ? (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {errors.role.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <div className="relative">
              <input
                {...register('password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : 'password-strength'}
                disabled={isLoading}
                className="input-field pr-12"
                placeholder="Create a password"
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
              Confirm password
            </label>
            <div className="relative">
              <input
                {...register('confirmPassword')}
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
                disabled={isLoading}
                className="input-field pr-12"
                placeholder="Repeat your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((value) => !value)}
                className="password-toggle"
                aria-label={showConfirm ? 'Hide password confirmation' : 'Show password confirmation'}
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
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-[rgba(51,93,60,0.12)] dark:border-[rgba(141,187,85,0.2)] bg-[#fafcf8] dark:bg-[#1a3020] p-4 text-sm text-slate-600 dark:text-gray-300">
          <input
            {...register('agreeToTerms')}
            type="checkbox"
            id="agreeToTerms"
            aria-invalid={!!errors.agreeToTerms}
            disabled={isLoading}
            className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-[rgba(141,187,85,0.4)] text-[var(--brand)] focus:ring-[var(--brand)]"
          />
          <span>I agree to the platform terms, verification requirements, and settlement policies.</span>
        </label>
        {errors.agreeToTerms ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {errors.agreeToTerms.message}
          </p>
        ) : null}

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
              Creating account...
            </span>
          ) : (
            'Create account'
          )}
        </button>
      </form>
    </AuthShell>
  );
}
