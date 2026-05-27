import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/ui';

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

const highlightItems = [
  { label: 'Verified settlements', value: '98%' },
  { label: 'Farmer onboarding', value: '24 hrs' },
  { label: 'Average payout cycle', value: '3 days' },
  { label: 'Mobile-first workflows', value: 'All screens' },
];

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="page-shell">
      <div className="content-wrap">
        <div className="auth-layout">
          <section className="auth-panel">
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <span className="eyebrow">Harvest Finance</span>
                <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  Cleaner workflows for agricultural finance teams.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700 dark:text-white/75 sm:text-base">
                  A consistent interface for farmers, buyers, and inspectors to manage orders,
                  financing, and verification in one place.
                </p>
              </div>

              <div className="auth-grid">
                {highlightItems.map((item) => (
                  <div key={item.label} className="auth-stat">
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white">{item.value}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-white/60">
                <span className="rounded-full bg-white/75 dark:bg-[rgba(74,222,128,0.12)] px-3 py-1.5">Traceable funding</span>
                <span className="rounded-full bg-white/75 dark:bg-[rgba(74,222,128,0.12)] px-3 py-1.5">Responsive dashboards</span>
                <span className="rounded-full bg-white/75 dark:bg-[rgba(74,222,128,0.12)] px-3 py-1.5">Farmer-first onboarding</span>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(141,187,85,0.28),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(141,187,85,0.15),transparent_32%)]" />
          </section>

          <section className="surface-card-strong p-6 sm:p-8">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-gray-200">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-sm font-bold tracking-[0.18em] text-[var(--brand-strong)]">
                    HF
                  </span>
                  <span>Harvest Finance</span>
                </Link>
                <ThemeToggle />
              </div>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-gray-300">{subtitle}</p>
            </div>

            {children}

            {footer ? <div className="mt-8 text-sm text-slate-600 dark:text-gray-400">{footer}</div> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
