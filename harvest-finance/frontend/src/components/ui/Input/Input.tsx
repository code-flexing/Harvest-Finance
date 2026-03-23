'use client';

import React, { forwardRef, useId } from 'react';
import { InputProps, TextareaProps, cn } from '../types';

/**
 * HarvestInput - A comprehensive input component with labels, validation, and icons
 * 
 * @example
 * // Basic input with label
 * <Input label="Email" type="email" placeholder="Enter your email" />
 * 
 * // Input with validation error
 * <Input label="Password" type="password" error="Password is required" />
 * 
 * // Input with hint text
 * <Input label="Username" hint="Must be at least 3 characters" />
 */

// ============================================
// Input Component
// ============================================

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      size = 'md',
      label,
      placeholder,
      value,
      defaultValue,
      error,
      hint,
      isRequired = false,
      isDisabled = false,
      isReadOnly = false,
      leftIcon,
      rightIcon,
      onChange,
      onBlur,
      onFocus,
      className,
      id,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const hasError = !!error;

    // Size-specific styles
    const sizeStyles: Record<string, string> = {
      sm: 'h-8 text-sm px-3',
      md: 'h-10 text-sm px-4',
      lg: 'h-12 text-base px-4',
    };

    // Icon size mappings
    const iconSizes: Record<string, string> = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-5 h-5',
    };

    const hasLeftIcon = !!leftIcon;
    const hasRightIcon = !!rightIcon;

    return (
      <div className={cn('w-full', className)} data-testid={testId}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium mb-1.5',
              hasError ? 'text-red-600' : 'text-gray-700',
              isDisabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {label}
            {isRequired && (
              <span className="text-red-500 ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {/* Left icon */}
          {hasLeftIcon && (
            <div
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2',
                'text-gray-400 pointer-events-none',
                iconSizes[size]
              )}
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            type={type}
            value={value}
            defaultValue={defaultValue}
            placeholder={placeholder}
            disabled={isDisabled}
            readOnly={isReadOnly}
            required={isRequired}
            onChange={onChange}
            onBlur={onBlur}
            onFocus={onFocus}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            className={cn(
              // Base styles
              'w-full rounded-lg border bg-white',
              'text-gray-900 placeholder:text-gray-400',
              'transition-all duration-200 ease-out',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',

              // Size
              sizeStyles[size],

              // Icon padding
              hasLeftIcon && 'pl-10',
              hasRightIcon && 'pr-10',

              // State styles
              hasError
                ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                : 'border-gray-300 hover:border-gray-400 focus:border-harvest-green-500 focus:ring-harvest-green-200',

              // Disabled styles
              isDisabled && 'bg-gray-100 cursor-not-allowed text-gray-500',

              // Read-only styles
              isReadOnly && 'bg-gray-50 cursor-default'
            )}
            {...props}
          />

          {/* Right icon */}
          {hasRightIcon && (
            <div
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                'text-gray-400 pointer-events-none',
                iconSizes[size]
              )}
              aria-hidden="true"
            >
              {rightIcon}
            </div>
          )}

          {/* Error icon */}
          {hasError && !rightIcon && (
            <div
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                'text-red-500 pointer-events-none',
                iconSizes[size]
              )}
              aria-hidden="true"
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-red-600 flex items-center gap-1"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Hint text */}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-gray-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================
// Textarea Component
// ============================================

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      placeholder,
      value,
      defaultValue,
      error,
      hint,
      isRequired = false,
      isDisabled = false,
      rows = 4,
      maxLength,
      showCount = false,
      className,
      id,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const hasError = !!error;
    const currentLength = String(value || defaultValue || '').length;

    return (
      <div className={cn('w-full', className)} data-testid={testId}>
        {/* Label */}
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              'block text-sm font-medium mb-1.5',
              hasError ? 'text-red-600' : 'text-gray-700',
              isDisabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {label}
            {isRequired && (
              <span className="text-red-500 ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        {/* Textarea field */}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={isDisabled}
          required={isRequired}
          rows={rows}
          maxLength={maxLength}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined
          }
          className={cn(
            // Base styles
            'w-full rounded-lg border bg-white px-4 py-3',
            'text-gray-900 placeholder:text-gray-400',
            'transition-all duration-200 ease-out',
            'focus:outline-none focus:ring-2 focus:ring-offset-0 resize-y',

            // State styles
            hasError
              ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 hover:border-gray-400 focus:border-harvest-green-500 focus:ring-harvest-green-200',

            // Disabled styles
            isDisabled && 'bg-gray-100 cursor-not-allowed text-gray-500'
          )}
          {...props}
        />

        {/* Character count */}
        {showCount && maxLength && (
          <div className="mt-1.5 text-sm text-gray-500 text-right">
            {currentLength}/{maxLength}
          </div>
        )}

        {/* Error message */}
        {error && (
          <p
            id={`${textareaId}-error`}
            className="mt-1.5 text-sm text-red-600 flex items-center gap-1"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Hint text */}
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="mt-1.5 text-sm text-gray-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Input, Textarea };
export type { InputProps, TextareaProps };
