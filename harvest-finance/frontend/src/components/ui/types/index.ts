/**
 * Common types and interfaces for the Harvest Finance UI Component System
 */

import { HTMLAttributes, ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, FormHTMLAttributes } from 'react';

// ============================================
// Base Component Props
// ============================================

/** Base props shared by all components */
export interface BaseProps {
  /** Custom class name */
  className?: string;
  /** Children content */
  children?: ReactNode;
  /** Test ID for testing */
  'data-testid'?: string;
}

/** Props with additional styling variants */
export interface VariantProps {
  /** Visual variant of the component */
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

// ============================================
// Button Types
// ============================================

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends BaseProps, ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

// ============================================
// Card Types
// ============================================

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps extends BaseProps, HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  hoverable?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

export interface CardHeaderProps extends BaseProps, HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export interface CardBodyProps extends BaseProps, HTMLAttributes<HTMLDivElement> {}

export interface CardFooterProps extends BaseProps, HTMLAttributes<HTMLDivElement> {
  divider?: boolean;
}

// ============================================
// Input Types
// ============================================

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends BaseProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  type?: InputType;
  size?: InputSize;
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export interface TextareaProps extends BaseProps, React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  rows?: number;
  maxLength?: number;
  showCount?: boolean;
}

// ============================================
// Modal Types
// ============================================

export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
export type ModalAnimation = 'fade' | 'scale' | 'slide' | 'none';

export interface ModalProps extends BaseProps {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  animation?: ModalAnimation;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  isCentered?: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
}

export interface ModalHeaderProps extends BaseProps, HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export interface ModalBodyProps extends BaseProps, HTMLAttributes<HTMLDivElement> {}

export interface ModalFooterProps extends BaseProps, HTMLAttributes<HTMLDivElement> {
  divider?: boolean;
}

// ============================================
// Badge Types
// ============================================

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends BaseProps, HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  isDot?: boolean;
  isPill?: boolean;
}

// ============================================
// Container Types
// ============================================

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ContainerProps extends BaseProps, HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
  isCentered?: boolean;
  isFluid?: boolean;
}

// ============================================
// Utility Types
// ============================================

/** Props for polymorphic components */
export type AsProp<C extends React.ElementType> = {
  as?: C;
};

/** Extract props from a component type */
export type ComponentProps<C extends React.ElementType> = 
  C extends React.ComponentType<infer P> ? P : never;

/** Merge multiple prop types */
export type MergeProps<T, U> = Omit<T, keyof U> & U;

/** Extended component props with 'as' polymorphism */
export type PolymorphicProps<C extends React.ElementType, Props = Record<string, unknown>> = 
  MergeProps<ComponentProps<C>, Props & AsProp<C>>;

// ============================================
// Form Types
// ============================================

export interface FormProps extends BaseProps, FormHTMLAttributes<HTMLFormElement> {
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  onReset?: (e: React.FormEvent<HTMLFormElement>) => void;
}

export interface FormGroupProps extends BaseProps, HTMLAttributes<HTMLDivElement> {
  label?: string;
  error?: string;
  hint?: string;
  isRequired?: boolean;
}

// ============================================
// Utility Functions
// ============================================

/** Merge class names, filtering out falsy values */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Create a namespaced class prefix */
export function withPrefix(prefix: string) {
  return (suffix: string) => `${prefix}-${suffix}`;
}
