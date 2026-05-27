'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SeasonalTipCard } from './SeasonalTipCard';
import { useSeasonalTipsStore } from '@/hooks/useSeasonalTips';
import { cn } from '@/components/ui/types';
import {
  CROP_LABELS,
  SEASON_LABELS,
  type CropType,
  type Season,
} from '@/lib/api/seasonal-tips';
import { Leaf, RefreshCw, Sprout } from 'lucide-react';

interface SeasonalTipsListProps {
  className?: string;
  showFilters?: boolean;
  compact?: boolean;
  maxItems?: number;
}

export function SeasonalTipsList({
  className,
  showFilters = true,
  compact = false,
  maxItems,
}: SeasonalTipsListProps) {
  const {
    tips,
    isLoading,
    error,
    selectedCrop,
    selectedSeason,
    setSelectedCrop,
    setSelectedSeason,
    refreshTips,
  } = useSeasonalTipsStore();

  useEffect(() => {
    refreshTips();
  }, [refreshTips]);

  const displayTips = maxItems ? tips.slice(0, maxItems) : tips;

  const cropOptions: CropType[] = [
    'GENERAL',
    'WHEAT',
    'CORN',
    'RICE',
    'SOYBEAN',
    'TOMATO',
    'POTATO',
    'COTTON',
    'BARLEY',
  ];
  const seasonOptions: Season[] = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];

  return (
    <section className={cn('space-y-5', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-harvest-green-50 dark:bg-[rgba(74,222,128,0.08)] flex items-center justify-center text-harvest-green-600 dark:text-harvest-green-400">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              Seasonal Tips & Insights
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Actionable guidance for your farm
            </p>
          </div>
        </div>
        <button
          onClick={refreshTips}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-1.5 text-sm text-harvest-green-600 dark:text-harvest-green-400 hover:text-harvest-green-700 dark:hover:text-harvest-green-300 transition-colors',
            isLoading && 'opacity-50 cursor-not-allowed',
          )}
          aria-label="Refresh tips"
        >
          <RefreshCw
            className={cn('w-4 h-4', isLoading && 'animate-spin')}
          />
          Refresh
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex flex-wrap gap-2"
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">Crop:</span>
            {cropOptions.map((crop) => (
              <button
                key={crop}
                onClick={() => setSelectedCrop(crop)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-full border transition-all',
                  selectedCrop === crop
                    ? 'bg-harvest-green-600 dark:bg-harvest-green-500 text-white border-harvest-green-600 dark:border-harvest-green-500 shadow-sm'
                    : 'bg-white dark:bg-[#1a3020] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[rgba(141,187,85,0.25)] hover:border-harvest-green-400 dark:hover:border-harvest-green-500 hover:text-harvest-green-700 dark:hover:text-harvest-green-300',
                )}
              >
                {CROP_LABELS[crop]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">Season:</span>
            {seasonOptions.map((season) => (
              <button
                key={season}
                onClick={() => setSelectedSeason(season)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-full border transition-all',
                  selectedSeason === season
                    ? 'bg-harvest-green-600 dark:bg-harvest-green-500 text-white border-harvest-green-600 dark:border-harvest-green-500 shadow-sm'
                    : 'bg-white dark:bg-[#1a3020] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[rgba(141,187,85,0.25)] hover:border-harvest-green-400 dark:hover:border-harvest-green-500 hover:text-harvest-green-700 dark:hover:text-harvest-green-300',
                )}
              >
                {SEASON_LABELS[season]}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && tips.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#162a1a] border border-gray-200 dark:border-[rgba(141,187,85,0.12)] rounded-xl p-4 animate-pulse"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#1a3020]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-[#1a3020] rounded w-3/4" />
                  <div className="h-3 bg-gray-100 dark:bg-[#162a1a] rounded w-1/2" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 bg-gray-100 dark:bg-[#162a1a] rounded" />
                <div className="h-3 bg-gray-100 dark:bg-[#162a1a] rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips Grid */}
      {!isLoading && displayTips.length > 0 && (
        <motion.div
          className={cn(
            'grid gap-4',
            compact
              ? 'grid-cols-1'
              : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
          )}
          layout
        >
          <AnimatePresence mode="popLayout">
            {displayTips.map((tip, idx) => (
              <SeasonalTipCard
                key={tip.id}
                tip={tip}
                index={idx}
                compact={compact}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && displayTips.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-harvest-green-50 dark:bg-[rgba(74,222,128,0.08)] flex items-center justify-center mb-4">
            <Leaf className="w-8 h-8 text-harvest-green-300 dark:text-harvest-green-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">
            No tips available
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            Try selecting a different crop or season to see relevant farming
            insights.
          </p>
        </motion.div>
      )}
    </section>
  );
}
