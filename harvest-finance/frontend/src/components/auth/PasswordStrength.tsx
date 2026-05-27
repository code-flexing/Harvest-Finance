'use client';

import { getPasswordStrength } from '@/lib/validations/auth';

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label } = getPasswordStrength(password);

  if (!password) return null;

  const colors = [
    'bg-red-400',
    'bg-amber-400',
    'bg-lime-400',
    'bg-green-500',
    'bg-emerald-500',
  ];

  const textColors = [
    'text-red-500',
    'text-amber-500',
    'text-lime-600',
    'text-green-600',
    'text-emerald-600',
  ];

  return (
    <div className="mt-3 space-y-2" aria-live="polite" role="status">
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              i < score ? colors[score] : 'bg-slate-200 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${textColors[score]}`}>{label}</p>
    </div>
  );
}
