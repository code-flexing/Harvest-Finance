'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MILESTONES, type Milestone } from '@/lib/milestones';
import { cn } from '@/components/ui/types';
import { Check } from 'lucide-react';

interface ProgressBarProps {
  progress: number;
  achievedMilestones: Milestone[];
  totalDeposited: number;
  seasonalTarget: number;
  asset?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  achievedMilestones,
  totalDeposited,
  seasonalTarget,
  asset = '',
}) => {
  const percentage = Math.min(progress * 100, 100);
  const isComplete = progress >= 1.0;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-zinc-300">
          Season Progress
        </span>
        <span className="font-bold text-harvest-green-600 dark:text-harvest-green-400">
          {percentage.toFixed(0)}%
        </span>
      </div>

      <div className="relative">
        {/* Track */}
        <div className="h-3 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full',
              isComplete
                ? 'bg-gradient-to-r from-harvest-green-500 to-harvest-green-400'
                : 'bg-gradient-to-r from-harvest-green-600 to-harvest-green-500'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        {/* Milestone markers */}
        <div className="absolute inset-0 flex items-center">
          {MILESTONES.map((milestone) => {
            const left = milestone * 100;
            const achieved = achievedMilestones.includes(milestone);

            return (
              <div
                key={milestone}
                className="absolute -translate-x-1/2"
                style={{ left: `${left}%` }}
              >
                <motion.div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                    achieved
                      ? 'bg-harvest-green-500 border-harvest-green-600 text-white'
                      : 'bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-600'
                  )}
                  initial={false}
                  animate={achieved ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {achieved && <Check className="w-3 h-3" />}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestone labels */}
      <div className="relative h-5">
        {MILESTONES.map((milestone) => {
          const left = milestone * 100;
          const achieved = achievedMilestones.includes(milestone);

          return (
            <span
              key={milestone}
              className={cn(
                'absolute -translate-x-1/2 text-xs font-medium',
                achieved
                  ? 'text-harvest-green-600 dark:text-harvest-green-400'
                  : 'text-gray-400 dark:text-zinc-500'
              )}
              style={{ left: `${left}%` }}
            >
              {milestone * 100}%
            </span>
          );
        })}
      </div>

      {/* Deposit summary */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
        <span>
          {totalDeposited.toLocaleString()} {asset} deposited
        </span>
        <span>
          Target: {seasonalTarget.toLocaleString()} {asset}
        </span>
      </div>
    </div>
  );
};
