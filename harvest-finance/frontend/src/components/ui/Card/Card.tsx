'use client';

import React, { forwardRef } from 'react';
import { CardProps, CardHeaderProps, CardBodyProps, CardFooterProps, cn } from '../types';

/**
 * HarvestCard - A versatile card component with multiple variants and subcomponents
 * 
 * @example
 * // Basic card
 * <Card>
 *   <CardHeader title="Card Title" subtitle="Card subtitle" />
 *   <CardBody>Card content goes here</CardBody>
 *   <CardFooter>Footer actions</CardFooter>
 * </Card>
 * 
 * // Hoverable card
 * <Card hoverable onClick={handleClick}>Clickable card</Card>
 */

// ============================================
// Card Component
// ============================================

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      hoverable = false,
      clickable = false,
      onClick,
      className,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = cn(
      'bg-white rounded-xl',
      'dark:bg-[#162a1a]',
      'transition-all duration-200 ease-out',
      'focus-within:ring-2 focus-within:ring-harvest-green-500 focus-within:ring-offset-2'
    );

    // Variant-specific styles
    const variantStyles: Record<string, string> = {
      default: cn(
        'border border-gray-200 shadow-sm',
        'hover:shadow-md hover:border-gray-300',
        'dark:border-[rgba(141,187,85,0.15)] dark:hover:border-[rgba(141,187,85,0.28)]'
      ),
      elevated: cn(
        'shadow-lg hover:shadow-xl',
        'hover:-translate-y-0.5'
      ),
      outlined: cn(
        'border-2 border-gray-200',
        'hover:border-harvest-green-300 hover:shadow-md',
        'dark:border-[rgba(141,187,85,0.2)] dark:hover:border-harvest-green-500'
      ),
      flat: cn(
        'bg-gray-50',
        'hover:bg-gray-100',
        'dark:bg-[#1a3020] dark:hover:bg-[#1f3826]'
      ),
    };

    // Padding styles
    const paddingStyles: Record<string, string> = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8',
    };

    // Interactive styles
    const interactiveStyles = cn(
      clickable && 'cursor-pointer hover:border-harvest-green-300 active:scale-[0.99]',
      hoverable && 'transform transition-transform duration-200'
    );

    const isInteractive = clickable || hoverable;

    return (
      <div
        ref={ref}
        onClick={clickable ? onClick : undefined}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        data-testid={testId}
        className={cn(
          baseStyles,
          variantStyles[variant],
          paddingStyles[padding],
          interactiveStyles,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// ============================================
// Card Header Component
// ============================================

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, title, subtitle, action, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-start justify-between gap-4', className)}
        {...props}
      >
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-normal">
              {subtitle}
            </p>
          )}
          {children}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// ============================================
// Card Body Component
// ============================================

const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex-1', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

// ============================================
// Card Footer Component
// ============================================

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, divider = false, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-3 pt-4 mt-4',
          divider && 'border-t border-gray-100 dark:border-gray-700',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

// ============================================
// Compound Components Export
// ============================================

export { Card, CardHeader, CardBody, CardFooter };
export type { CardProps, CardHeaderProps, CardBodyProps, CardFooterProps };
