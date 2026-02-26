'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signupSchema, type SignupFormData, type UserRole } from '@/lib/validations/auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { PasswordStrength } from '@/components/auth/PasswordStrength';

const ROLES: { value: UserRole; label: string; icon: string; desc: string }[] = [
  { value: 'farmer', label: 'Farmer', icon: '🌾', desc: 'Grow and sell produce' },
  { value: 'buyer', label: 'Buyer', icon: '🛒', desc: 'Purchase farm products' },
  { value: 'inspector', label: 'Inspector', icon: '🔍', desc: 'Verify product quality' },
];

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading, error, clearError, isAuthenticated, hydrate } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'farmer', agreeToTerms: false as unknown as true },
  });

  const password = watch('password', '');
  const selectedRole = watch('role');

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
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-green-700 dark:text-green-400 mb-2">
            🌾 Harvest Finance
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Join the agricultural revolution
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
            Create Your Account
          </h2>

          {/* Error Banner */}
          {error && (
            <div
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              role="alert"
              aria-live="polite"
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <input
                {...register('name')}
                type="text"
                id="name"
                autoComplete="name"
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors disabled:opacity-50"
                placeholder="John Farmer"
              />
              {errors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-500" role="alert">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
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
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors disabled:opacity-50"
                placeholder="farmer@example.com"
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-500" role="alert">{errors.email.message}</p>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select Your Role
              </label>
              <div className="grid grid-cols-3 gap-3">
                {ROLES.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setValue('role', role.value, { shouldValidate: true })}
                    disabled={isLoading}
                    aria-pressed={selectedRole === role.value}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedRole === role.value
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700 bg-white dark:bg-gray-700'
                    } disabled:opacity-50`}
                  >
                    <span className="text-2xl">{role.icon}</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">{role.label}</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight text-center">{role.desc}</span>
                  </button>
                ))}
              </div>
              {errors.role && (
                <p className="mt-1 text-sm text-red-500" role="alert">{errors.role.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
                  aria-required="true"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : 'password-strength'}
                  disabled={isLoading}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors disabled:opacity-50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              <div id="password-strength">
                <PasswordStrength password={password} />
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-500" role="alert">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
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
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors disabled:opacity-50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="confirm-error" className="mt-1 text-sm text-red-500" role="alert">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3">
              <input
                {...register('agreeToTerms')}
                type="checkbox"
                id="agreeToTerms"
                aria-required="true"
                aria-invalid={!!errors.agreeToTerms}
                disabled={isLoading}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <label htmlFor="agreeToTerms" className="text-sm text-gray-600 dark:text-gray-400">
                I agree to the{' '}
                <span className="text-green-600 dark:text-green-400 font-medium cursor-pointer hover:underline">
                  Terms of Service
                </span>{' '}
                and{' '}
                <span className="text-green-600 dark:text-green-400 font-medium cursor-pointer hover:underline">
                  Privacy Policy
                </span>
              </label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-sm text-red-500 -mt-3" role="alert">{errors.agreeToTerms.message}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium transition-colors"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
