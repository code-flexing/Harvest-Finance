'use client';

import React, { forwardRef } from 'react';
import { ContainerProps, cn } from '../types';

/**
 * HarvestContainer - A responsive container component for layout structure
 * 
 * @example
 * // Centered container with max-width
 * <Container size="lg">Content goes here</Container>
 * 
 * // Full-width fluid container
 * <Container isFluid>Full width content</Container>
 * 
 * // Centered content
 * <Container size="md" isCentered>
 *   <Card>Centered card</Card>
 * </Container>
 */

// ============================================
// Container Component
// ============================================

const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      children,
      size = 'lg',
      isCentered = false,
      isFluid = false,
      className,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = cn(
      'w-full mx-auto',
      'transition-all duration-200'
    );

    // Size-specific max-widths (Tailwind defaults)
    const sizeStyles: Record<string, string> = {
      sm: 'max-w-screen-sm',
      md: 'max-w-screen-md',
      lg: 'max-w-screen-lg',
      xl: 'max-w-screen-xl',
      '2xl': 'max-w-screen-2xl',
      full: 'max-w-full',
    };

    // Responsive padding (horizontal)
    const paddingStyles = cn(
      'px-4 sm:px-6 lg:px-8'
    );

    // Centered modifier
    const centeredStyle = isCentered && 'flex flex-col items-center';

    // Fluid modifier (full width with optional max-width override)
    const fluidStyle = isFluid
      ? 'max-w-full'
      : sizeStyles[size];

    return (
      <div
        ref={ref}
        data-testid={testId}
        className={cn(
          baseStyles,
          fluidStyle,
          paddingStyles,
          centeredStyle,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';

// ============================================
// Section Component (extends Container with section styling)
// ============================================

interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'className'> {
  children?: React.ReactNode;
  as?: 'section' | 'div' | 'main' | 'aside';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  isCentered?: boolean;
  isFluid?: boolean;
  background?: 'white' | 'gray' | 'green' | 'gradient';
  paddingY?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  'data-testid'?: string;
}

const Section: React.FC<SectionProps> = ({
  children,
  as: Component = 'section',
  size = 'lg',
  isCentered = false,
  isFluid = false,
  background = 'white',
  paddingY = 'lg',
  className,
  'data-testid': testId,
  ...props
}) => {
  // Background styles
  const backgroundStyles: Record<string, string> = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    green: 'bg-harvest-green-50',
    gradient: 'bg-gradient-to-br from-harvest-green-50 to-white',
  };

  // Vertical padding styles
  const paddingYStyles: Record<string, string> = {
    none: '',
    sm: 'py-4',
    md: 'py-8',
    lg: 'py-12',
    xl: 'py-16',
  };

  return (
    <Component
      data-testid={testId}
      className={cn(
        backgroundStyles[background],
        paddingYStyles[paddingY],
        className
      )}
      {...props}
    >
      <Container size={size} isCentered={isCentered} isFluid={isFluid}>
        {children}
      </Container>
    </Component>
  );
};

Section.displayName = 'Section';

// ============================================
// Stack Component (vertical/horizontal flex layouts)
// ============================================

interface StackProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'className'> {
  direction?: 'row' | 'col';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'between';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  className?: string;
  'data-testid'?: string;
}

const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      children,
      direction = 'col',
      gap = 'md',
      align = 'stretch',
      justify = 'start',
      wrap = false,
      className,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    // Gap styles
    const gapStyles: Record<string, string> = {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    };

    // Align items
    const alignStyles: Record<string, string> = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      between: 'items-between',
    };

    // Justify content
    const justifyStyles: Record<string, string> = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
    };

    const isHorizontal = direction === 'row';

    return (
      <div
        ref={ref}
        data-testid={testId}
        className={cn(
          'flex',
          isHorizontal ? 'flex-row' : 'flex-col',
          gapStyles[gap],
          alignStyles[align],
          justifyStyles[justify],
          wrap && 'flex-wrap',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Stack.displayName = 'Stack';

// ============================================
// Inline Component (inline flex layouts)
// ============================================

interface InlineProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'className'> {
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'baseline';
  className?: string;
  'data-testid'?: string;
}

const Inline = forwardRef<HTMLSpanElement, InlineProps>(
  (
    {
      children,
      gap = 'sm',
      align = 'center',
      className,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    // Gap styles
    const gapStyles: Record<string, string> = {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
    };

    // Align items
    const alignStyles: Record<string, string> = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      baseline: 'items-baseline',
    };

    return (
      <span
        ref={ref}
        data-testid={testId}
        className={cn(
          'inline-flex',
          gapStyles[gap],
          alignStyles[align],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Inline.displayName = 'Inline';

export { Container, Section, Stack, Inline };
export type { ContainerProps, SectionProps, StackProps, InlineProps };
