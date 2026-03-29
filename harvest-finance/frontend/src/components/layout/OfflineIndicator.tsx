'use client';

import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineIndicator() {
  const online = useOnlineStatus();

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium min-h-[44px] touch-manipulation ${
        online
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
          : 'bg-amber-50 text-amber-900 border border-amber-200'
      }`}
    >
      {online ? (
        <>
          <Wifi className="w-5 h-5 flex-shrink-0" aria-hidden />
          <span>En línea — los datos se sincronizan automáticamente</span>
        </>
      ) : (
        <>
          <WifiOff className="w-5 h-5 flex-shrink-0" aria-hidden />
          <span>Sin conexión — mostrando datos guardados en el dispositivo</span>
        </>
      )}
    </div>
  );
}
