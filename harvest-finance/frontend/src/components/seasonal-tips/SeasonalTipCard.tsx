'use client';

import { motion } from 'framer-motion';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/components/ui/types';
import type { BadgeVariant } from '@/components/ui/types';
import type { SeasonalTip, TipType } from '@/lib/api/seasonal-tips';
import { TIP_TYPE_LABELS, CROP_LABELS, SEASON_LABELS } from '@/lib/api/seasonal-tips';
import {
  Sprout,
  Droplets,
  Wheat,
  FlaskConical,
  Bug,
  Mountain,
  TrendingUp,
  Target,
  Trophy,
  Rocket,
  BarChart3,
  Leaf,
  Snowflake,
  Cherry,
} from 'lucide-react';

function TipIcon({
  iconName,
  className,
}: {
  iconName: string | null;
  className?: string;
}) {
  const props = { className: className ?? 'w-5 h-5' };
  switch (iconName) {
    case 'sprout':
      return <Sprout {...props} />;
    case 'droplets':
      return <Droplets {...props} />;
    case 'wheat':
      return <Wheat {...props} />;
    case 'flask':
      return <FlaskConical {...props} />;
    case 'bug':
      return <Bug {...props} />;
    case 'mountain':
      return <Mountain {...props} />;
    case 'trending-up':
      return <TrendingUp {...props} />;
    case 'target':
      return <Target {...props} />;
    case 'trophy':
      return <Trophy {...props} />;
    case 'rocket':
      return <Rocket {...props} />;
    case 'bar-chart':
      return <BarChart3 {...props} />;
    case 'snowflake':
      return <Snowflake {...props} />;
    case 'tomato':
      return <Cherry {...props} />;
    case 'potato':
      return <Mountain {...props} />;
    case 'corn':
      return <Wheat {...props} />;
    case 'waves':
      return <Droplets {...props} />;
    default:
      return <Leaf {...props} />;
  }
}

const tipTypeVariant: Record<TipType, BadgeVariant> = {
  PLANTING: 'success',
  WATERING: 'info',
  HARVEST: 'warning',
  FERTILIZING: 'secondary',
  PEST_CONTROL: 'error',
  SOIL_CARE: 'primary',
  MARKET_INSIGHT: 'default',
  VAULT_MILESTONE: 'primary',
};

interface SeasonalTipCardProps {
  tip: SeasonalTip;
  index?: number;
  compact?: boolean;
}

export function SeasonalTipCard({ tip, index = 0, compact = false }: SeasonalTipCardProps) {
  const variant = tipTypeVariant[tip.tipType] || 'default';
  const isMilestone = tip.tipType === 'VAULT_MILESTONE';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        duration: 0.35,
        delay: index * 0.06,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      layout
    >
      <Card
        variant={isMilestone ? 'elevated' : 'default'}
        hoverable
        className={cn(
          'h-full flex flex-col transition-all',
          isMilestone &&
            'border-harvest-green-300 dark:border-harvest-green-700 bg-linear-to-br from-harvest-green-50 to-white dark:from-[rgba(74,222,128,0.08)] dark:to-[#162a1a]',
          compact ? 'p-0' : '',
        )}
        padding={compact ? 'none' : 'md'}
      >
        <CardHeader
          title={tip.title}
          action={
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                isMilestone
                  ? 'bg-harvest-green-500 text-white'
                  : 'bg-harvest-green-50 dark:bg-[rgba(74,222,128,0.08)] text-harvest-green-600 dark:text-harvest-green-400 border border-harvest-green-100 dark:border-[rgba(74,222,128,0.2)]',
              )}
            >
              <TipIcon iconName={tip.iconName} />
            </div>
          }
          className="pb-2"
        >
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <Badge variant={variant} size="sm" isPill>
              {TIP_TYPE_LABELS[tip.tipType]}
            </Badge>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {CROP_LABELS[tip.cropType]} &middot; {SEASON_LABELS[tip.season]}
            </span>
          </div>
        </CardHeader>

        <CardBody className="py-2">
          <p
            className={cn(
              'text-sm text-gray-600 dark:text-gray-300 leading-relaxed',
              compact && 'line-clamp-2',
            )}
          >
            {tip.content}
          </p>
        </CardBody>

        {tip.metrics && Object.keys(tip.metrics).length > 0 && (
          <CardFooter divider className="mt-auto pt-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full">
              {Object.entries(tip.metrics).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                    {formatMetricKey(key)}
                  </span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}

function formatMetricKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
