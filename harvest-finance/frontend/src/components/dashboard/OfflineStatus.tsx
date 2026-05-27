'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { 
  CloudOff, 
  RefreshCcw, 
  Wifi, 
  CheckCircle2, 
  AlertTriangle,
  BatteryLow,
  SignalZero
} from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { useOfflineData } from '@/hooks/useOfflineData';

interface OfflineStatusProps {
  compact?: boolean;
  showDetailed?: boolean;
  onSyncClick?: () => void;
}

export function OfflineStatus({ compact = false, showDetailed = false, onSyncClick }: OfflineStatusProps) {
  const { isOnline, isSyncing, pendingActions, lastSyncAt, triggerSync } = useOfflineData();
  const [networkQuality, setNetworkQuality] = useState<'good' | 'slow' | 'poor'>('good');

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = navigator as Navigator & { connection: { effectiveType: string } };
      const effectiveType = connection.connection?.effectiveType;
      
      if (effectiveType === '4g') {
        setNetworkQuality('good');
      } else if (effectiveType === '3g' || effectiveType === '2g') {
        setNetworkQuality('slow');
      } else {
        setNetworkQuality('poor');
      }
    }
  }, []);

  const handleSync = useCallback(() => {
    if (onSyncClick) {
      onSyncClick();
    } else {
      void triggerSync();
    }
  }, [onSyncClick, triggerSync]);

  const getNetworkIcon = () => {
    if (!isOnline) return <SignalZero className="h-3.5 w-3.5" />;
    if (networkQuality === 'poor') return <BatteryLow className="h-3.5 w-3.5" />;
    return <Wifi className="h-3.5 w-3.5" />;
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-amber-50 border-amber-200 text-amber-800';
    if (pendingActions > 0) return 'bg-blue-50 border-blue-200 text-blue-800';
    return 'bg-emerald-50 border-emerald-200 text-emerald-800';
  };

  const getIconBgColor = () => {
    if (!isOnline) return 'bg-amber-100 text-amber-700';
    if (pendingActions > 0) return 'bg-blue-100 text-blue-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (pendingActions > 0) return `${pendingActions} pending`;
    return 'Online';
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusColor()}`}>
        {isSyncing ? (
          <RefreshCcw className="h-3 w-3 animate-spin" />
        ) : (
          getNetworkIcon()
        )}
        <span>{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-3 ${getStatusColor()}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${getIconBgColor()}`}>
          {isSyncing ? (
            <RefreshCcw className="h-4 w-4 animate-spin" />
          ) : isOnline ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <CloudOff className="h-4 w-4" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{getStatusText()}</span>
            {pendingActions > 0 && !isSyncing && (
              <Badge variant="warning" size="sm" isPill>
                {pendingActions} queued
              </Badge>
            )}
            {isOnline && pendingActions === 0 && (
              <Badge variant="success" size="sm" isPill>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Synced
              </Badge>
            )}
          </div>
          
          {showDetailed && (
            <p className="mt-0.5 text-xs opacity-80">
              {isOnline
                ? pendingActions > 0
                  ? 'Tap sync to upload pending changes'
                  : 'All data is up to date'
                : 'Changes will sync when connection returns'}
            </p>
          )}
          
          {lastSyncAt && showDetailed && (
            <p className="mt-0.5 text-xs opacity-60">
              Last synced: {new Date(lastSyncAt).toLocaleTimeString()}
            </p>
          )}
        </div>

        {!isOnline && pendingActions > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 bg-white/50 border-current"
            onClick={handleSync}
            disabled
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Wait
          </Button>
        )}

        {isOnline && pendingActions > 0 && (
          <Button
            variant="primary"
            size="sm"
            className="shrink-0"
            onClick={handleSync}
            isLoading={isSyncing}
            leftIcon={<RefreshCcw className="h-3.5 w-3.5" />}
          >
            Sync
          </Button>
        )}
      </div>
    </div>
  );
}