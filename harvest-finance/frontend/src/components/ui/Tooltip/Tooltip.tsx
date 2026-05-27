'use client';

import React, { useState, useRef, useEffect, type ReactNode } from 'react';

export interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const arrowPositionStyles = {
    top: 'bottom-[-4px] left-1/2 -translate-x-1/2',
    bottom: 'top-[-4px] left-1/2 -translate-x-1/2',
    left: 'right-[-4px] top-1/2 -translate-y-1/2',
    right: 'left-[-4px] top-1/2 -translate-y-1/2',
  };

  const tooltipPositionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      <span
        role="tooltip"
        className={`
          absolute ${tooltipPositionStyles[position]}
          z-[1600]
          max-w-sm px-3 py-2
          text-sm font-normal
          bg-gray-900 dark:bg-gray-700
          text-white dark:text-gray-100
          rounded-lg shadow-lg
          transition-opacity duration-200
          pointer-events-none
          whitespace-normal
          break-words
          ${isVisible ? 'opacity-100 visible' : 'opacity-0 invisible'}
          ${className}
        `}
      >
        {content}
        <span
          className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 ${arrowPositionStyles[position]}`}
        />
      </span>
    </span>
  );
};

export default Tooltip;
