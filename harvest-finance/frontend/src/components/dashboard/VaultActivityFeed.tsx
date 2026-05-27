"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Trophy,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import {
  useVaultRealtime,
  VaultActivityEvent,
  VaultActivityType,
} from "@/hooks/useVaultRealtime";

const activityConfig: Record<
  VaultActivityType,
  {
    icon: React.FC<{ className?: string }>;
    color: string;
    label: string;
    bgColor: string;
  }
> = {
  deposit: {
    icon: ArrowUpRight,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    label: "Deposit",
  },
  withdrawal: {
    icon: ArrowDownLeft,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    label: "Withdrawal",
  },
  milestone: {
    icon: Trophy,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    label: "Milestone",
  },
  ai_insight: {
    icon: Sparkles,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    label: "AI Insight",
  },
};

function ActivityItem({ event }: { event: VaultActivityEvent }) {
  const config = activityConfig[event.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex items-start gap-3 border-b border-gray-100 dark:border-[rgba(141,187,85,0.1)] py-3 last:border-0"
    >
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${config.bgColor}`}
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
          {event.type === "deposit" && event.amount !== undefined && (
            <span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                +${event.amount.toLocaleString()}
              </span>
              {event.newBalance !== undefined && (
                <span className="text-gray-400 dark:text-gray-500">
                  {" "}
                  - Balance: ${event.newBalance.toLocaleString()}
                </span>
              )}
            </span>
          )}
          {event.type === "withdrawal" && event.amount !== undefined && (
            <span>
              <span className="font-medium text-amber-600 dark:text-amber-400">
                -${event.amount.toLocaleString()}
              </span>
              {event.newBalance !== undefined && (
                <span className="text-gray-400 dark:text-gray-500">
                  {" "}
                  - Balance: ${event.newBalance.toLocaleString()}
                </span>
              )}
            </span>
          )}
          {event.type === "milestone" && event.milestone}
          {event.type === "ai_insight" && event.insight}
        </p>
      </div>
      <Badge
        variant="default"
        className={`flex-shrink-0 border border-current bg-transparent text-xs ${config.color}`}
      >
        {config.label}
      </Badge>
    </motion.div>
  );
}

export function VaultActivityFeed() {
  const { isConnected, activities, clearActivities } = useVaultRealtime({
    maxActivityItems: 15,
  });

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            <Activity className="h-5 w-5 text-harvest-green-600" />
            Live Vault Activity
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Real-time updates from all vault actions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activities.length > 0 && (
            <button
              onClick={clearActivities}
              className="text-xs text-gray-400 dark:text-gray-500 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            >
              Clear
            </button>
          )}
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <>
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="h-2 w-2 rounded-full bg-emerald-500"
                />
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <Wifi className="h-3 w-3" /> Live
                </span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-gray-300" />
                <span className="flex items-center gap-1 text-xs font-medium text-gray-400">
                  <WifiOff className="h-3 w-3" /> Offline
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <Card variant="default">
        <CardBody className="p-4">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <Activity className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">
                {isConnected
                  ? "Listening for vault activity..."
                  : "Connecting to live feed..."}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Updates appear here instantly when deposits, withdrawals, or
                milestones occur.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {activities.map((event, index) => (
                <ActivityItem
                  key={`${event.vaultId}-${event.timestamp}-${index}`}
                  event={event}
                />
              ))}
            </AnimatePresence>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
