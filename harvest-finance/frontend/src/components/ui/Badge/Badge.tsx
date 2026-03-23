'use client';

import React, { forwardRef } from 'react';
import { BadgeProps, cn } from '../types';

/**
 * HarvestBadge - A status indicator badge component with multiple variants
 * 
 * @example
 * // Status badges
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning">Pending</Badge>
 * <Badge variant="error">Failed</Badge>
 * 
 * // With dot indicator
 * <Badge variant="info" isDot>Processing</Badge>
 * 
 * // Pill style
 * <Badge variant="primary" isPill>New</Badge>
 */

// ============================================
// Badge Component
// ============================================

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      isDot = false,
      isPill = false,
      className,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = cn(
      'inline-flex items-center font-medium',
      'transition-colors duration-150',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1'
    );

    // Variant-specific styles
    const variantStyles: Record<string, string> = {
      default: cn(
        'bg-gray-100 text-gray-700',
        'ring-gray-200/50'
      ),
      primary: cn(
        'bg-harvest-green-100 text-harvest-green-800',
        'ring-harvest-green-200/50'
      ),
      secondary: cn(
        'bg-purple-100 text-purple-800',
        'ring-purple-200/50'
      ),
      success: cn(
        'bg-emerald-100 text-emerald-800',
        'ring-emerald-200/50'
      ),
      warning: cn(
        'bg-amber-100 text-amber-800',
        'ring-amber-200/50'
      ),
      error: cn(
        'bg-red-100 text-red-800',
        'ring-red-200/50'
      ),
      info: cn(
        'bg-blue-100 text-blue-800',
        'ring-blue-200/50'
      ),
    };

    // Size-specific styles
    const sizeStyles: Record<string, string> = {
      sm: cn(
        'text-xs px-1.5 py-0.5',
        isDot ? 'gap-1' : 'gap-1'
      ),
      md: cn(
        'text-sm px-2.5 py-0.5',
        isDot ? 'gap-1.5' : 'gap-1.5'
      ),
      lg: cn(
        'text-base px-3 py-1',
        isDot ? 'gap-2' : 'gap-2'
      ),
    };

    // Dot indicator size
    const dotSizes: Record<string, string> = {
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-2.5 h-2.5',
    };

    // Dot color based on variant
    const dotColors: Record<string, string> = {
      default: 'bg-gray-500',
      primary: 'bg-harvest-green-500',
      secondary: 'bg-purple-500',
      success: 'bg-emerald-500',
      warning: 'bg-amber-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
    };

    // Pill style modifier
    const pillStyle = isPill ? 'rounded-full' : 'rounded-md';

    return (
      <span
        ref={ref}
        data-testid={testId}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          pillStyle,
          'ring-1 ring-inset',
          className
        )}
        {...props}
      >
        {isDot && (
          <span
            className={cn(
              'rounded-full flex-shrink-0 animate-pulse',
              dotSizes[size],
              dotColors[variant]
            )}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// ============================================
// Preset Status Badges
// ============================================

/** Preset badges for common status indicators */
const StatusBadge = {
  /** Green badge for active/approved status */
  Active: (props?: Omit<BadgeProps, 'variant'>) => (
    <Badge variant="success" {...props}>
      Active
    </Badge>
  ),
  
  /** Yellow badge for pending status */
  Pending: (props?: Omit<BadgeProps, 'variant'>) => (
    <Badge variant="warning" {...props}>
      Pending
    </Badge>
  ),
  
  /** Red badge for inactive/rejected status */
  Inactive: (props?: Omit<BadgeProps, 'variant'>) => (
    <Badge variant="error" {...props}>
      Inactive
    </Badge>
  ),
  
  /** Blue badge for informational status */
  Processing: (props?: Omit<BadgeProps, 'variant'>) => (
    <Badge variant="info" isDot {...props}>
      Processing
    </Badge>
  ),
  
  /** Green badge for completed status */
  Completed: (props?: Omit<BadgeProps, 'variant'>) => (
    <Badge variant="success" {...props}>
      Completed
    </Badge>
  ),
  
  /** Red badge for failed status */
  Failed: (props?: Omit<BadgeProps, 'variant'>) => (
    <Badge variant="error" {...props}>
      Failed
    </Badge>
  ),
  
  /** Gray badge for draft status */
  Draft: (props?: Omit<BadgeProps, 'variant'>) => (
    <Badge variant="default" {...props}>
      Draft
    </Badge>
  ),
  
  /** Purple badge for premium/new status */
  New: (props?: Omit<BadgeProps, 'variant'>) => (
    <Badge variant="secondary" isPill {...props}>
      New
    </Badge>
  ),
};

export { Badge, StatusBadge };
export type { BadgeProps };
