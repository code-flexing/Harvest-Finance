"use client";

import { Badge, Button, Card, CardBody } from "@/components/ui";
import { CloudOff, RefreshCcw, Wifi, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

interface ConnectivityBannerProps {
  isOnline: boolean;
  queuedActions: number;
  lastUpdated?: string | null;
  isSyncing: boolean;
  onSync: () => void;
}

export function ConnectivityBanner({
  isOnline,
  queuedActions,
  lastUpdated,
  isSyncing,
  onSync,
}: ConnectivityBannerProps) {
  const { t } = useTranslation();

  return (
    <Card
      variant="outlined"
      className={
        isOnline
          ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-900/20 backdrop-blur-sm shadow-sm"
          : "border-amber-200 dark:border-amber-900 bg-amber-50/90 dark:bg-amber-900/20 backdrop-blur-sm shadow-md"
      }
    >
      <CardBody className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`mt-0.5 flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner ${
              isOnline
                ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300"
            }`}
          >
            <AnimatePresence mode="wait">
              {isOnline ? (
                <motion.div
                  key="online"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <Wifi className="h-6 w-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="offline"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <CloudOff className="h-6 w-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {isOnline
                  ? "Connected & Secure"
                  : "Offline Mode Active"}
              </h2>
              <AnimatePresence>
                {queuedActions > 0 && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                  >
                    <Badge
                      variant="warning"
                      size="sm"
                      isPill
                      className="animate-pulse"
                    >
                      {queuedActions} {t('common.pending_sync')}
                    </Badge>
                  </motion.div>
                )}
                {isOnline && queuedActions === 0 && (
                   <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                  >
                    <Badge variant="success" size="sm" isPill className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Fully Synced
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
              {isOnline
                ? "Your dashboard is live. Any offline actions have been synchronized. Real-time farming intelligence is active."
                : "Your connection is unstable, but you can continue managing your vaults. All changes will be saved locally and uploaded once you're back online."}
            </p>
            {lastUpdated && (
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                <RefreshCcw className="w-3 h-3" />
                Last synchronized: {new Date(lastUpdated).toLocaleString('en-US', { 
                  hour: 'numeric', 
                  minute: 'numeric', 
                  second: 'numeric',
                  hour12: true 
                })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 self-end md:self-center">
          <Button
            variant={isOnline ? "primary" : "outline"}
            size="md"
            isLoading={isSyncing}
            onClick={onSync}
            leftIcon={<RefreshCcw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />}
            isDisabled={!isOnline || (queuedActions === 0 && isOnline)}
            className="whitespace-nowrap shadow-sm hover:shadow-md transition-all"
          >
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
