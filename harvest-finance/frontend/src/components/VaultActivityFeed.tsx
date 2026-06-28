"use client";

import React, { useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Pause,
  Play,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { useVaultRealtime, VaultActivityEvent } from "@/hooks/useVaultRealtime";

export type VaultActivityType = 'deposit' | 'withdrawal' | 'yield_compounded';

export interface VaultDetailActivityEvent extends VaultActivityEvent {
  type: VaultActivityType;
  walletAddress?: string;
  yieldAmount?: number;
}

const activityConfig: Record<
  VaultActivityType,
  {
    icon: React.FC<{ className?: string }>;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  deposit: {
    icon: ArrowUpRight,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    label: "Deposit",
  },
  withdrawal: {
    icon: ArrowDownLeft,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    label: "Withdrawal",
  },
  yield_compounded: {
    icon: RefreshCw,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    label: "Yield",
  },
};

const supportedActivityTypes = ['deposit', 'withdrawal', 'yield_compounded'] as const;

type SupportedVaultActivityType = (typeof supportedActivityTypes)[number];

function anonymizeAddress(address: string): string {
  if (!address) {
    return '';
  }
  if (address.length < 10) {
    return address;
  }
  return `${address.slice(0, 4)}...${address.slice(-3)}`;
}

interface ActivityItemProps {
  event: VaultDetailActivityEvent;
}

const ActivityItem = React.forwardRef<HTMLDivElement, ActivityItemProps>(({ event }, ref) => {
  const config = activityConfig[event.type];
  const Icon = config.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex items-start gap-3 border-b border-gray-100 dark:border-[rgba(141,187,85,0.1)] py-3 last:border-0"
      role="article"
      aria-label={`${config.label} activity`}
    >
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${config.bgColor}`}
        aria-hidden="true"
      >
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {event.vaultName}
          </p>
          <span className="flex-shrink-0 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
            {formatDistanceToNow(new Date(event.timestamp), {
              addSuffix: true,
            })}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {event.type === 'deposit' && event.amount !== undefined && (
            <span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">+${event.amount.toLocaleString()}</span>
              {event.newBalance !== undefined && (
                <span className="text-gray-400 dark:text-gray-500">{' '}- Balance: ${event.newBalance.toLocaleString()}</span>
              )}
            </span>
          )}
          {event.type === 'withdrawal' && event.amount !== undefined && (
            <span>
              <span className="font-medium text-red-600 dark:text-red-400">-${event.amount.toLocaleString()}</span>
              {event.newBalance !== undefined && (
                <span className="text-gray-400 dark:text-gray-500">{' '}- Balance: ${event.newBalance.toLocaleString()}</span>
              )}
            </span>
          )}
          {event.type === 'yield_compounded' && (
            <span>
              <span className="font-medium text-blue-600 dark:text-blue-400">+${event.yieldAmount !== undefined ? event.yieldAmount.toLocaleString() : event.amount?.toLocaleString() || '0'}</span>{' '}yield compounded
              {event.newBalance !== undefined && (
                <span className="text-gray-400 dark:text-gray-500">{' '}- Balance: ${event.newBalance.toLocaleString()}</span>
              )}
            </span>
          )}
        </p>
        {event.walletAddress && (
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 font-mono">
            {anonymizeAddress(event.walletAddress)}
          </p>
        )}
      </div>
      <Badge
        variant="default"
        className={`flex-shrink-0 border border-current bg-transparent text-xs ${config.color} ${
          event.type === 'deposit' ? 'border-emerald-600' : event.type === 'withdrawal' ? 'border-red-600' : 'border-blue-600'
        }`}
      >
        {config.label}
      </Badge>
    </motion.div>
  );
});

interface VaultActivityFeedProps {
  vaultId: string;
  vaultName?: string;
  maxEvents?: number;
}

export function VaultActivityFeed({
  vaultId,
  vaultName,
  maxEvents = 50,
}: VaultActivityFeedProps) {
  const { isConnected, activities, connectionError, isPaused, togglePause } = useVaultRealtime({
    maxActivityItems: maxEvents,
    targetVaultId: vaultId,
  });

  const visibleActivities = activities.filter(
    (event): event is VaultDetailActivityEvent =>
      supportedActivityTypes.includes(event.type as SupportedVaultActivityType),
  );

  const listContainerRef = useRef<HTMLDivElement>(null);
  const prevActivitiesLengthRef = useRef(activities.length);

  useEffect(() => {
    if (isPaused) return;

    if (activities.length > prevActivitiesLengthRef.current) {
      listContainerRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
    prevActivitiesLengthRef.current = activities.length;
  }, [activities.length, isPaused]);

  return (
    <section className="w-full" aria-label="Vault activity feed">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            <RefreshCw className="h-5 w-5 text-harvest-green-600" />
            Activity Feed
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {vaultName || "Vault"} real-time events
          </p>
          {isPaused && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Auto-scroll paused. New events will appear at the top.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {connectionError && (
            <div className="flex items-center gap-1 text-xs text-red-500" title={connectionError} role="alert">
              <AlertCircle className="h-3 w-3" />
              <span className="hidden sm:inline">Reconnecting...</span>
            </div>
          )}
          <button
            onClick={togglePause}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 transition-colors hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-harvest-green-500"
            aria-label={isPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
            aria-pressed={isPaused}
          >
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            <span className="hidden sm:inline">{isPaused ? "Resume" : "Pause"}</span>
          </button>
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <>
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="h-2 w-2 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <Wifi className="h-3 w-3" />
                  <span className="hidden sm:inline">Live</span>
                </span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-gray-300" aria-hidden="true" />
                <span className="flex items-center gap-1 text-xs font-medium text-gray-400">
                  <WifiOff className="h-3 w-3" />
                  <span className="hidden sm:inline">Offline</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <Card variant="default">
        <CardBody className="p-4">
          {visibleActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <RefreshCw className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {isConnected ? "Listening for activity..." : "Connecting to live feed..."}
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Real-time updates will appear here for deposits, withdrawals, and yield.
              </p>
            </div>
          ) : (
            <div
              ref={listContainerRef}
              className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 dark:scrollbar-track-gray-800 dark:scrollbar-thumb-gray-600 pr-2"
              role="feed"
              aria-live="polite"
              aria-relevant="additions text"
              aria-busy={!isConnected}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {visibleActivities
                  .slice()
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((event, index) => (
                    <ActivityItem
                      key={`${event.vaultId}-${event.timestamp}-${index}`}
                      event={event}
                    />
                  ))}
              </AnimatePresence>
            </div>
          )}
        </CardBody>
      </Card>
    </section>
  );
}

export { anonymizeAddress };