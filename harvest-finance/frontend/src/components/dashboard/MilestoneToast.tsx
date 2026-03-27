'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore, type ToastNotification } from '@/lib/stores/notification-store';
import { X, Trophy, Sprout, Target, PartyPopper } from 'lucide-react';

const ICONS: Record<string, React.ReactNode> = {
  vault_milestone: <Trophy className="w-5 h-5" />,
  success: <Sprout className="w-5 h-5" />,
  info: <Target className="w-5 h-5" />,
};

function ToastItem({ toast }: { toast: ToastNotification }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const duration = toast.duration ?? 5000;

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, dismiss]);

  const isMilestone = toast.type === 'vault_milestone';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`
        relative w-80 sm:w-96 rounded-xl shadow-lg border overflow-hidden
        ${isMilestone
          ? 'bg-gradient-to-br from-harvest-green-50 to-white dark:from-harvest-green-950/40 dark:to-zinc-900 border-harvest-green-200 dark:border-harvest-green-800'
          : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700'
        }
      `}
    >
      {isMilestone && (
        <motion.div
          className="absolute inset-0 bg-harvest-green-400/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      )}

      <div className="relative p-4">
        <div className="flex items-start gap-3">
          <div
            className={`
              flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
              ${isMilestone
                ? 'bg-harvest-green-100 text-harvest-green-600 dark:bg-harvest-green-900/50 dark:text-harvest-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400'
              }
            `}
          >
            {ICONS[toast.type] ?? ICONS.info}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                {toast.title}
              </h4>
              {isMilestone && <PartyPopper className="w-4 h-4 text-harvest-green-500" />}
            </div>
            <p className="text-sm text-gray-600 dark:text-zinc-400 mt-0.5">
              {toast.message}
            </p>
            {toast.tip && (
              <p className="text-xs text-harvest-green-600 dark:text-harvest-green-400 mt-1.5 flex items-center gap-1">
                <Sprout className="w-3 h-3" />
                {toast.tip}
              </p>
            )}
            {toast.nextTarget && (
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                Next target: {toast.nextTarget}
              </p>
            )}
          </div>

          <button
            onClick={() => dismiss(toast.id)}
            className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 dark:text-zinc-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Auto-dismiss progress */}
      <motion.div
        className="h-0.5 bg-harvest-green-400 dark:bg-harvest-green-500"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}

export const MilestoneToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed top-4 right-4 z-[1600] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
