'use client';

import React from 'react';
import { Inbox, BarChart2, Layers, LucideIcon } from 'lucide-react';
import { Button } from '../Button';

export type EmptyStateVariant = 'no-deposits' | 'no-data' | 'no-vaults' | 'custom';

interface PresetConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}

const PRESETS: Record<Exclude<EmptyStateVariant, 'custom'>, PresetConfig> = {
  'no-deposits': {
    icon: Inbox,
    title: 'No deposits yet',
    description: 'You have not made any deposits. Start earning yield by depositing into a vault.',
    ctaLabel: 'Browse Vaults',
    ctaHref: '/vaults',
  },
  'no-data': {
    icon: BarChart2,
    title: 'No data available',
    description: 'There is no data to display at the moment. Check back later.',
  },
  'no-vaults': {
    icon: Layers,
    title: 'No vaults found',
    description: 'No vaults match your current filters. Try adjusting your search criteria.',
    ctaLabel: 'Clear Filters',
  },
};

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  className?: string;
}

export function EmptyState({
  variant = 'no-data',
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCtaClick,
  className = '',
}: EmptyStateProps) {
  const preset = variant !== 'custom' ? PRESETS[variant] : null;

  const Icon = icon ?? preset?.icon ?? Inbox;
  const resolvedTitle = title ?? preset?.title ?? 'Nothing here';
  const resolvedDescription = description ?? preset?.description ?? '';
  const resolvedCtaLabel = ctaLabel ?? preset?.ctaLabel;
  const resolvedCtaHref = ctaHref ?? preset?.ctaHref;

  const handleCta = () => {
    if (onCtaClick) {
      onCtaClick();
    } else if (resolvedCtaHref) {
      window.location.href = resolvedCtaHref;
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
      role="status"
      aria-label={resolvedTitle}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-harvest-green-50 dark:bg-harvest-green-900/20">
        <Icon className="h-8 w-8 text-harvest-green-500 dark:text-harvest-green-400" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">{resolvedTitle}</h3>
      {resolvedDescription && (
        <p className="mb-6 max-w-sm text-sm text-gray-500 dark:text-gray-400">{resolvedDescription}</p>
      )}
      {resolvedCtaLabel && (
        <Button variant="primary" size="sm" onClick={handleCta}>
          {resolvedCtaLabel}
        </Button>
      )}
    </div>
  );
}
