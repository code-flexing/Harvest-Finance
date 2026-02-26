'use client';

import { getPasswordStrength } from '@/lib/validations/auth';

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label } = getPasswordStrength(password);

  if (!password) return null;

  const colors = [
    'bg-red-500',     // 0 - Weak
    'bg-orange-500',  // 1 - Weak
    'bg-yellow-500',  // 2 - Fair
    'bg-green-500',   // 3 - Strong
    'bg-emerald-500', // 4 - Very Strong
  ];

  const textColors = [
    'text-red-500',
    'text-orange-500',
    'text-yellow-500',
    'text-green-500',
    'text-emerald-500',
  ];

  return (
    <div className="mt-2 space-y-1.5" aria-live="polite" role="status">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < score ? colors[score] : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${textColors[score]}`}>
        {label}
      </p>
    </div>
  );
}
