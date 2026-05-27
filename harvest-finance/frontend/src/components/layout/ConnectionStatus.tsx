'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { syncService } from '@/lib/sync-service';
import { motion, AnimatePresence } from 'framer-motion';

export const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    const interval = setInterval(async () => {
      const count = await syncService.getQueuedCount();
      setQueuedCount(count);
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncService.syncActions();
    const count = await syncService.getQueuedCount();
    setQueuedCount(count);
    setIsSyncing(false);
  };

  return (
    <div className="fixed bottom-4 left-4 z-[60]">
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="flex items-center gap-3 bg-red-600 text-white px-4 py-2.5 rounded-full shadow-lg border border-red-500/50 backdrop-blur-md"
          >
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Offline Mode</span>
            {queuedCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-md text-xs">
                {queuedCount} pending
              </span>
            )}
          </motion.div>
        )}

        {isOnline && queuedCount > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-3 bg-harvest-green-600 text-white px-4 py-2.5 rounded-full shadow-lg border border-harvest-green-500/50 hover:bg-harvest-green-700 transition-colors disabled:opacity-70"
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {isSyncing ? 'Syncing data...' : `Sync ${queuedCount} pending actions`}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
