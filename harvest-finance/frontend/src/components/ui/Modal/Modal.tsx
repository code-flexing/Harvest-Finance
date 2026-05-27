'use client';

import React, { forwardRef, useEffect, useCallback, useRef } from 'react';
import { ModalProps, ModalHeaderProps, ModalBodyProps, ModalFooterProps, cn } from '../types';

/**
 * HarvestModal - A fully accessible modal component with animations
 * 
 * @example
 * <Modal isOpen={isOpen} onClose={handleClose} size="md">
 *   <ModalHeader onClose={handleClose}>Modal Title</ModalHeader>
 *   <ModalBody>Modal content goes here</ModalBody>
 *   <ModalFooter>
 *     <Button variant="outline" onClick={handleClose}>Cancel</Button>
 *     <Button variant="primary" onClick={handleSubmit}>Submit</Button>
 *   </ModalFooter>
 * </Modal>
 */

// ============================================
// Animation Keyframes (inline for SSR compatibility)
// ============================================

const animationStyles = `
  @keyframes modalFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes modalFadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  @keyframes modalScaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  
  @keyframes modalScaleOut {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(0.95); }
  }
  
  @keyframes modalSlideUpIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes modalSlideUpOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(20px); }
  }
`;

// ============================================
// Modal Component
// ============================================

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      children,
      isOpen,
      onClose,
      size = 'md',
      animation = 'scale',
      closeOnOverlayClick = true,
      closeOnEsc = true,
      showCloseButton = true,
      isCentered = false,
      initialFocus,
      className,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const previousActiveElement = useRef<HTMLElement | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Inject animation styles once
    useEffect(() => {
      if (typeof document !== 'undefined') {
        const styleId = 'harvest-modal-styles';
        if (!document.getElementById(styleId)) {
          const styleElement = document.createElement('style');
          styleElement.id = styleId;
          styleElement.textContent = animationStyles;
          document.head.appendChild(styleElement);
        }
      }
    }, []);

    // Handle escape key
    useEffect(() => {
      if (!isOpen || !closeOnEsc) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEsc, onClose]);

    // Lock body scroll when modal is open
    useEffect(() => {
      if (isOpen) {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        previousActiveElement.current = document.activeElement as HTMLElement;
        
        // Focus management
        if (initialFocus?.current) {
          initialFocus.current.focus();
        } else if (modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length > 0) {
            (focusableElements[0] as HTMLElement).focus();
          }
        }

        return () => {
          document.body.style.overflow = previousOverflow;
          if (previousActiveElement.current) {
            previousActiveElement.current.focus();
          }
        };
      }
    }, [isOpen, initialFocus]);

    // Handle overlay click
    const handleOverlayClick = useCallback(
      (e: React.MouseEvent) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
          onClose();
        }
      },
      [closeOnOverlayClick, onClose]
    );

    // Size-specific styles
    const sizeStyles: Record<string, string> = {
      xs: 'max-w-sm',
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      '2xl': 'max-w-6xl',
      full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
    };

    // Animation-specific styles
    const getAnimationStyles = (isEntering: boolean) => {
      const animationName = {
        fade: isEntering ? 'modalFadeIn' : 'modalFadeOut',
        scale: isEntering ? 'modalScaleIn' : 'modalScaleOut',
        slide: isEntering ? 'modalSlideUpIn' : 'modalSlideUpOut',
        none: 'none',
      }[animation];

      return animation === 'none'
        ? ''
        : `animate-${animationName}`;
    };

    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className={cn('fixed inset-0 z-modalBackdrop', className)}
        data-testid={testId}
        role="dialog"
        aria-modal="true"
        onClick={handleOverlayClick}
      >
        {/* Backdrop */}
        <div
          className={cn(
            'absolute inset-0 bg-black/50 backdrop-blur-sm',
            'transition-opacity duration-200',
            getAnimationStyles(true)
          )}
          style={{
            animation: animation === 'fade' 
              ? 'modalFadeIn 200ms ease-out forwards' 
              : undefined
          }}
        />

        {/* Modal container */}
        <div
          className={cn(
            'flex items-center justify-center min-h-full p-4',
            isCentered && 'items-center'
          )}
        >
          <div
            ref={modalRef}
            className={cn(
              'relative w-full bg-white rounded-xl shadow-2xl',
              'dark:bg-[#162a1a]',
              'transform transition-all duration-200',
              sizeStyles[size],
              animation !== 'none' && animation !== 'fade' && 'animate-modalScaleIn',
              animation === 'slide' && 'animate-modalSlideUpIn'
            )}
            style={{
              animation: `modalScaleIn 200ms ease-out forwards`
            }}
            role="document"
            {...props}
          >
            {children}

            {/* Close button */}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'absolute top-4 right-4',
                  'p-1.5 rounded-lg text-gray-400',
                  'transition-colors duration-150',
                  'hover:bg-gray-100 hover:text-gray-600',
                  'dark:text-gray-400 dark:hover:bg-[#1a3020] dark:hover:text-gray-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-harvest-green-500'
                )}
                aria-label="Close modal"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

// ============================================
// Modal Header Component
// ============================================

const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ children, title, onClose, showCloseButton = false, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 pt-6 pb-4',
          'border-b border-gray-100 dark:border-[rgba(141,187,85,0.15)]',
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
            )}
            {children}
          </div>
          {showCloseButton && onClose && (
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'p-1.5 rounded-lg text-gray-400',
                'transition-colors duration-150',
                'hover:bg-gray-100 hover:text-gray-600',
                'dark:text-gray-400 dark:hover:bg-[#1a3020] dark:hover:text-gray-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-harvest-green-500'
              )}
              aria-label="Close modal"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }
);

ModalHeader.displayName = 'ModalHeader';

// ============================================
// Modal Body Component
// ============================================

const ModalBody = forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('px-6 py-4 overflow-y-auto', className)}
        style={{ maxHeight: 'calc(100vh - 200px)' }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ModalBody.displayName = 'ModalBody';

// ============================================
// Modal Footer Component
// ============================================

const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ children, divider = true, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 pb-6 pt-4',
          'flex items-center justify-end gap-3',
          divider && 'border-t border-gray-100 dark:border-[rgba(141,187,85,0.15)] mt-4',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ModalFooter.displayName = 'ModalFooter';

// ============================================
// Compound Components Export
// ============================================

export { Modal, ModalHeader, ModalBody, ModalFooter };
export type { ModalProps, ModalHeaderProps, ModalBodyProps, ModalFooterProps };
