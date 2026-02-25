'use client';

import { useState } from 'react';

type UserRole = 'farmer' | 'buyer' | 'inspector' | null;

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Logo/Brand Section */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-green-700 mb-2">
            🌾 Harvest Finance
          </h1>
          <p className="text-gray-600">
            Join our community and empower agriculture
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Create Your Account
          </h2>

          {/* Error Message Area */}
          <div
            id="error-message"
            className="hidden mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
            role="alert"
            aria-live="polite"
          >
            <p className="text-sm text-red-600">
              Error message will appear here
            </p>
          </div>

          {/* Signup Form */}
          <form className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                I am a <span className="text-red-500" aria-label="required">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Farmer Role */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('farmer')}
                  className={`p-4 border-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    selectedRole === 'farmer'
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                  role="radio"
                  aria-checked={selectedRole === 'farmer'}
                  aria-label="Select Farmer role"
                >
                  <div className="text-3xl mb-2">🌾</div>
                  <div className="font-semibold text-gray-800">Farmer</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Sell produce & get financing
                  </div>
                </button>

                {/* Buyer Role */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('buyer')}
                  className={`p-4 border-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    selectedRole === 'buyer'
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                  role="radio"
                  aria-checked={selectedRole === 'buyer'}
                  aria-label="Select Buyer role"
                >
                  <div className="text-3xl mb-2">🛒</div>
                  <div className="font-semibold text-gray-800">Buyer</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Purchase quality produce
                  </div>
                </button>

                {/* Inspector Role */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('inspector')}
                  className={`p-4 border-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    selectedRole === 'inspector'
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                  role="radio"
                  aria-checked={selectedRole === 'inspector'}
                  aria-label="Select Inspector role"
                >
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="font-semibold text-gray-800">Inspector</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Verify quality & delivery
                  </div>
                </button>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  First Name <span className="text-red-500" aria-label="required">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  autoComplete="given-name"
                  required
                  aria-required="true"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-black transition-colors"
                  placeholder="John"
                />
              </div>

              {/* Last Name */}
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Last Name <span className="text-red-500" aria-label="required">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  autoComplete="family-name"
                  required
                  aria-required="true"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-black transition-colors"
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address <span className="text-red-500" aria-label="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                required
                aria-required="true"
                aria-describedby="email-error"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-black transition-colors"
                placeholder="john.doe@example.com"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Phone Number <span className="text-red-500" aria-label="required">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                autoComplete="tel"
                required
                aria-required="true"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-black transition-colors"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password <span className="text-red-500" aria-label="required">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                autoComplete="new-password"
                required
                aria-required="true"
                aria-describedby="password-strength password-error"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-black transition-colors"
                placeholder="••••••••"
                onChange={(e) => {
                  // Visual-only password strength calculation
                  const length = e.target.value.length;
                  if (length === 0) setPasswordStrength(0);
                  else if (length < 6) setPasswordStrength(1);
                  else if (length < 10) setPasswordStrength(2);
                  else if (length < 14) setPasswordStrength(3);
                  else setPasswordStrength(4);
                }}
              />
              
              {/* Password Strength Indicator */}
              <div id="password-strength" className="mt-2" aria-live="polite">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        level <= passwordStrength
                          ? passwordStrength === 1
                            ? 'bg-red-500'
                            : passwordStrength === 2
                            ? 'bg-orange-500'
                            : passwordStrength === 3
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                          : 'bg-gray-200'
                      }`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                {passwordStrength > 0 && (
                  <p className="text-xs text-gray-600">
                    Password strength:{' '}
                    <span
                      className={`font-medium ${
                        passwordStrength === 1
                          ? 'text-red-600'
                          : passwordStrength === 2
                          ? 'text-orange-600'
                          : passwordStrength === 3
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}
                    >
                      {passwordStrength === 1
                        ? 'Weak'
                        : passwordStrength === 2
                        ? 'Fair'
                        : passwordStrength === 3
                        ? 'Good'
                        : 'Strong'}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Password <span className="text-red-500" aria-label="required">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                required
                aria-required="true"
                aria-describedby="confirm-password-error"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-black transition-colors"
                placeholder="••••••••"
              />
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start">
              <input
                type="checkbox"
                id="terms"
                name="terms"
                required
                aria-required="true"
                className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                I agree to the{' '}
                <a
                  href="/terms"
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="/privacy"
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  Privacy Policy
                </a>
              </label>
            </div>

            {/* Signup Button */}
            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
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
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a
                href="/login"
                className="text-green-600 hover:text-green-700 font-medium transition-colors"
              >
                Log in
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-500">
          Built with ❤️ for farmers worldwide
        </p>
      </div>
    </div>
  );
}
