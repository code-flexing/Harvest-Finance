'use client';

import React from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ShieldCheck, Wallet } from 'lucide-react';

export const CustodialWalletBadge: React.FC = () => {
  const { user } = useAuthStore();

  if (!user || user.wallet_type !== 'custodial') {
    return null;
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--brand-muted)] border border-[var(--brand)]/20 shadow-sm"
      title="Platform-Managed Wallet"
    >
      <ShieldCheck className="w-3.5 h-3.5 text-[var(--brand-strong)]" />
      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--brand-strong)]">
        Custodial
      </span>
    </div>
  );
};
