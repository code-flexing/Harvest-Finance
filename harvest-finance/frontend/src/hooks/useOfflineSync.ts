'use client';

import { useEffect, useRef } from 'react';
import { pushSync } from '@/lib/offline/sync-service';

export function useOfflineSync(online: boolean): void {
  const syncing = useRef(false);

  useEffect(() => {
    if (!online || syncing.current) return;

    const run = async () => {
      syncing.current = true;
      try {
        await pushSync();
      } finally {
        syncing.current = false;
      }
    };

    void run();
  }, [online]);
}
