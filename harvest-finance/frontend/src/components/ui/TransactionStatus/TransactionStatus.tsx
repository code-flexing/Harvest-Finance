'use client';

import React from 'react';
import { CheckCircle2, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';

export type TxStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CLAIMED' | 'PROCESSING' | string;

interface StatusConfig {
  icon: React.ReactNode;
  label: string;
  className: string;
}

function getStatusConfig(status: TxStatus): StatusConfig {
  switch (status) {
    case 'CONFIRMED':
    case 'CLAIMED':
      return {
        icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
        label: status === 'CLAIMED' ? 'Claimed' : 'Confirmed',
        className:
          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50',
      };
    case 'FAILED':
      return {
        icon: <XCircle className="w-3.5 h-3.5" aria-hidden="true" />,
        label: 'Failed',
        className:
          'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50',
      };
    case 'PROCESSING':
      return {
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />,
        label: 'Processing',
        className:
          'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50',
      };
    case 'PENDING':
      return {
        icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" />,
        label: 'Pending',
        className:
          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50',
      };
    default:
      return {
        icon: <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />,
        label: status,
        className:
          'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700',
      };
  }
}

interface TransactionStatusBadgeProps {
  status: TxStatus;
  className?: string;
}

export function TransactionStatusBadge({ status, className = '' }: TransactionStatusBadgeProps) {
  const config = getStatusConfig(status);
  return (
    <span
      role="status"
      aria-label={`Transaction status: ${config.label}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className} ${className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

interface TransactionStatusDotProps {
  status: TxStatus;
  className?: string;
}

export function TransactionStatusDot({ status, className = '' }: TransactionStatusDotProps) {
  const isPulsing = status === 'PENDING' || status === 'PROCESSING';

  const dotColor =
    status === 'CONFIRMED' || status === 'CLAIMED'
      ? 'bg-emerald-500'
      : status === 'FAILED'
        ? 'bg-red-500'
        : status === 'PROCESSING'
          ? 'bg-blue-500'
          : status === 'PENDING'
            ? 'bg-amber-500'
            : 'bg-gray-400';

  return (
    <span className={`relative inline-flex h-2.5 w-2.5 ${className}`} aria-hidden="true">
      {isPulsing && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotColor} opacity-60`}
        />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`} />
    </span>
  );
}
