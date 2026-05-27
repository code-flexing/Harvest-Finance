'use client';

import React from 'react';
import {
  AlertCircle,
  WifiOff,
  FileQuestion,
  ShieldOff,
  ServerCrash,
  LucideIcon,
} from 'lucide-react';
import { Button } from '../Button';
import { cn } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ErrorStateVariant =
  | 'inline'
  | 'page'
  | 'network'
  | 'not-found'
  | 'unauthorized'
  | 'server';

export interface ErrorStateProps {
  /** Visual variant – controls icon, colours, and layout */
  variant?: ErrorStateVariant;
  /** Override the default title for the variant */
  title?: string;
  /** Override the default description for the variant */
  description?: string;
  /** Primary action label */
  actionLabel?: string;
  /** Primary action handler */
  onAction?: () => void;
  /** Secondary action label (e.g. "Go home") */
  secondaryActionLabel?: string;
  /** Secondary action handler */
  onSecondaryAction?: () => void;
  /** Custom icon – overrides the variant default */
  icon?: LucideIcon;
  className?: string;
}

// ─── Preset config ────────────────────────────────────────────────────────────

interface PresetConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  secondaryActionLabel?: string;
  /** Tailwind colour classes: [iconBg, iconColor, titleColor] */
  colors: [string, string, string];
}

const PRESETS: Record<ErrorStateVariant, PresetConfig> = {
  inline: {
    icon: AlertCircle,
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
    actionLabel: 'Try again',
    colors: ['bg-red-50 dark:bg-red-900/20', 'text-red-500', 'text-red-700 dark:text-red-400'],
  },
  page: {
    icon: AlertCircle,
    title: 'Something went wrong',
    description: 'We encountered an unexpected error. Our team has been notified.',
    actionLabel: 'Try again',
    secondaryActionLabel: 'Go home',
    colors: ['bg-red-50 dark:bg-red-900/20', 'text-red-500', 'text-gray-900 dark:text-white'],
  },
  network: {
    icon: WifiOff,
    title: 'No internet connection',
    description: 'Check your network connection and try again.',
    actionLabel: 'Retry',
    colors: ['bg-amber-50 dark:bg-amber-900/20', 'text-amber-500', 'text-gray-900 dark:text-white'],
  },
  'not-found': {
    icon: FileQuestion,
    title: 'Page not found',
    description: "The page you're looking for doesn't exist or has been moved.",
    actionLabel: 'Go home',
    colors: ['bg-blue-50 dark:bg-blue-900/20', 'text-blue-500', 'text-gray-900 dark:text-white'],
  },
  unauthorized: {
    icon: ShieldOff,
    title: 'Access denied',
    description: "You don't have permission to view this page.",
    actionLabel: 'Sign in',
    secondaryActionLabel: 'Go home',
    colors: ['bg-orange-50 dark:bg-orange-900/20', 'text-orange-500', 'text-gray-900 dark:text-white'],
  },
  server: {
    icon: ServerCrash,
    title: 'Server error',
    description: 'Our servers are having trouble. Please try again in a few minutes.',
    actionLabel: 'Try again',
    secondaryActionLabel: 'Go home',
    colors: ['bg-red-50 dark:bg-red-900/20', 'text-red-500', 'text-gray-900 dark:text-white'],
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ErrorState({
  variant = 'inline',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon,
  className,
}: ErrorStateProps) {
  const preset = PRESETS[variant];
  const Icon = icon ?? preset.icon;
  const resolvedTitle = title ?? preset.title;
  const resolvedDescription = description ?? preset.description;
  const resolvedActionLabel = actionLabel ?? preset.actionLabel;
  const resolvedSecondaryLabel = secondaryActionLabel ?? preset.secondaryActionLabel;
  const [iconBg, iconColor, titleColor] = preset.colors;

  const isInline = variant === 'inline';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        isInline
          ? 'flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4'
          : 'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center rounded-full flex-shrink-0',
          isInline ? 'h-8 w-8' : 'mb-4 h-16 w-16',
          iconBg
        )}
      >
        <Icon
          className={cn(isInline ? 'h-4 w-4' : 'h-8 w-8', iconColor)}
          aria-hidden="true"
        />
      </div>

      {/* Text */}
      <div className={cn(isInline ? 'flex-1 min-w-0' : '')}>
        <p
          className={cn(
            'font-semibold',
            isInline ? 'text-sm' : 'text-lg mb-2',
            titleColor
          )}
        >
          {resolvedTitle}
        </p>
        {resolvedDescription && (
          <p
            className={cn(
              'text-gray-500 dark:text-gray-400',
              isInline ? 'text-xs mt-0.5' : 'text-sm max-w-sm mb-6'
            )}
          >
            {resolvedDescription}
          </p>
        )}

        {/* Actions */}
        {(resolvedActionLabel || resolvedSecondaryLabel) && (
          <div
            className={cn(
              'flex gap-3',
              isInline ? 'mt-2' : 'justify-center flex-wrap'
            )}
          >
            {resolvedActionLabel && onAction && (
              <Button
                variant={isInline ? 'ghost' : 'primary'}
                size={isInline ? 'xs' : 'sm'}
                onClick={onAction}
                className={isInline ? 'text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40' : ''}
              >
                {resolvedActionLabel}
              </Button>
            )}
            {resolvedSecondaryLabel && onSecondaryAction && (
              <Button
                variant="outline"
                size={isInline ? 'xs' : 'sm'}
                onClick={onSecondaryAction}
              >
                {resolvedSecondaryLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
