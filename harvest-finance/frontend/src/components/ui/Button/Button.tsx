'use client';

import React, { forwardRef } from 'react';
import { ButtonProps, cn } from '../types';

/**
 * HarvestButton - A versatile button component with multiple variants and states
 * 
 * @example
 * // Primary button
 * <Button variant="primary" onClick={handleClick}>Click Me</Button>
 * 
 * // Loading state
 * <Button variant="primary" isLoading>Processing...</Button>
 * 
 * // With icons
 * <Button leftIcon={<SaveIcon />} rightIcon={<ArrowRightIcon />}>Save & Continue</Button>
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isDisabled = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      disabled,
      type = 'button',
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const isDisabledOrLoading = isDisabled || disabled || isLoading;

    // Base styles applied to all buttons
    const baseStyles = cn(
      'inline-flex items-center justify-center font-medium',
      'transition-all duration-200 ease-out',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'select-none'
    );

    // Variant-specific styles
    const variantStyles: Record<string, string> = {
      primary: cn(
        'bg-harvest-green-600 text-white',
        'hover:bg-harvest-green-700 active:bg-harvest-green-800',
        'focus-visible:ring-harvest-green-500',
        'shadow-sm hover:shadow-md active:shadow-sm'
      ),
      secondary: cn(
        'bg-harvest-green-100 text-harvest-green-800',
        'hover:bg-harvest-green-200 active:bg-harvest-green-300',
        'focus-visible:ring-harvest-green-500',
        'dark:bg-harvest-green-900 dark:text-harvest-green-300',
        'dark:hover:bg-harvest-green-800 dark:active:bg-harvest-green-700'
      ),
      outline: cn(
        'border-2 border-harvest-green-600 text-harvest-green-600',
        'bg-transparent hover:bg-harvest-green-50 active:bg-harvest-green-100',
        'focus-visible:ring-harvest-green-500',
        'dark:border-harvest-green-500 dark:text-harvest-green-400',
        'dark:hover:bg-harvest-green-900 dark:active:bg-harvest-green-800'
      ),
      ghost: cn(
        'text-harvest-green-700',
        'hover:bg-harvest-green-100 active:bg-harvest-green-200',
        'focus-visible:ring-harvest-green-500',
        'dark:text-harvest-green-400',
        'dark:hover:bg-harvest-green-900 dark:active:bg-harvest-green-800'
      ),
      danger: cn(
        'bg-red-600 text-white',
        'hover:bg-red-700 active:bg-red-800',
        'focus-visible:ring-red-500',
        'shadow-sm hover:shadow-md active:shadow-sm'
      ),
      success: cn(
        'bg-emerald-600 text-white',
        'hover:bg-emerald-700 active:bg-emerald-800',
        'focus-visible:ring-emerald-500',
        'shadow-sm hover:shadow-md active:shadow-sm'
      ),
    };

    // Size-specific styles
    const sizeStyles: Record<string, string> = {
      xs: cn(
        'h-7 px-2.5 text-xs rounded-md gap-1',
        leftIcon && rightIcon ? 'pl-2' : leftIcon ? 'pl-2' : rightIcon ? 'pr-2' : ''
      ),
      sm: cn(
        'h-8 px-3 text-sm rounded-md gap-1.5',
        leftIcon && rightIcon ? 'pl-2.5' : leftIcon ? 'pl-2.5' : rightIcon ? 'pr-2.5' : ''
      ),
      md: cn(
        'h-10 px-4 text-sm rounded-lg gap-2',
        leftIcon && rightIcon ? 'pl-3' : leftIcon ? 'pl-3' : rightIcon ? 'pr-3' : ''
      ),
      lg: cn(
        'h-12 px-6 text-base rounded-lg gap-2.5',
        leftIcon && rightIcon ? 'pl-4' : leftIcon ? 'pl-4' : rightIcon ? 'pr-4' : ''
      ),
      xl: cn(
        'h-14 px-8 text-lg rounded-xl gap-3',
        leftIcon && rightIcon ? 'pl-5' : leftIcon ? 'pl-5' : rightIcon ? 'pr-5' : ''
      ),
    };

    // Full width modifier
    const fullWidthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabledOrLoading}
        data-testid={testId}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidthStyle,
          className
        )}
        aria-disabled={isDisabledOrLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
