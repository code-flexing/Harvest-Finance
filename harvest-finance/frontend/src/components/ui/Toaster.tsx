'use client';
import { useEffect } from 'react';
import { useToastStore } from '@/store/useToastStore';

export function Toaster() {
  const { isVisible, message, type, hideToast } = useToastStore();

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        hideToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, hideToast]);

  if (!isVisible) return null;

  const bgColors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  const iconColors = {
    success: 'text-emerald-500',
    error: 'text-red-500',
    info: 'text-blue-500',
  };

  const getIcon = (type: keyof typeof bgColors) => {
    switch (type) {
      case 'success':
        return (
          <svg className={`w-5 h-5 ${iconColors[type]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className={`w-5 h-5 ${iconColors[type]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'info':
        return (
          <svg className={`w-5 h-5 ${iconColors[type]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center shadow-lg rounded-lg transition-all duration-300 animate-in slide-in-from-right-2"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className={`px-4 py-3 rounded-lg text-white font-medium flex justify-between items-center min-w-[300px] ${bgColors[type]}`}>
        <div className="flex items-center gap-3">
          {getIcon(type)}
          <span>{message}</span>
        </div>
        <button
          onClick={hideToast}
          className="ml-4 opacity-80 hover:opacity-100 font-bold focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
