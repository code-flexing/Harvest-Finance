'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

const themes = ['system', 'light', 'dark'] as const;
type Theme = (typeof themes)[number];

const icons: Record<Theme, React.ReactNode> = {
  system: <Monitor className="w-4 h-4" />,
  light: <Sun className="w-4 h-4" />,
  dark: <Moon className="w-4 h-4" />,
};

const nextLabel: Record<Theme, string> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Render a placeholder of the same size to avoid layout shift during SSR
  if (!mounted) {
    return <div className="w-9 h-9 rounded-lg" aria-hidden="true" />;
  }

  const current = (theme as Theme) ?? 'system';
  const next = themes[(themes.indexOf(current) + 1) % themes.length];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`Switch to ${nextLabel[current]} mode`}
      aria-label={`Switch to ${nextLabel[current]} mode`}
      className={[
        'inline-flex items-center justify-center w-9 h-9 rounded-lg',
        'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
        'dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800',
        'transition-colors duration-150',
        className ?? '',
      ].join(' ')}
    >
      {icons[current]}
    </button>
  );
}
