'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="harvest-finance-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
