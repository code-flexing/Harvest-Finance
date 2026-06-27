'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export type VaultActivityType = 'deposit' | 'withdrawal' | 'yield_compounded' | 'milestone' | 'ai_insight';

export interface VaultActivityEvent {
  type: VaultActivityType;
  vaultId: string;
  vaultName: string;
  amount?: number;
  userId?: string;
  walletAddress?: string;
  yieldAmount?: number;
  milestone?: string;
  insight?: string;
  newBalance?: number;
  timestamp: string;
}

interface UseVaultRealtimeOptions {
  vaultIds?: string[];
  maxActivityItems?: number;
  targetVaultId?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export function useVaultRealtime({
  vaultIds = [],
  maxActivityItems = 20,
  targetVaultId,
}: UseVaultRealtimeOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activities, setActivities] = useState<VaultActivityEvent[]>([]);
  const [latestEvent, setLatestEvent] = useState<VaultActivityEvent | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const addActivity = useCallback(
    (event: VaultActivityEvent) => {
      // If targetVaultId is specified, only add events for that vault
      if (targetVaultId && event.vaultId !== targetVaultId) {
        return;
      }
      setActivities((prev) => [event, ...prev].slice(0, maxActivityItems));
      setLatestEvent(event);
    },
    [maxActivityItems, targetVaultId],
  );

  useEffect(() => {
    const socket = io(`${BACKEND_URL}/vault-activity`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
      // Subscribe to specific vaults
      vaultIds.forEach((id) => socket.emit('subscribe:vault', id));
      // Subscribe to target vault if provided
      if (targetVaultId) {
        socket.emit('subscribe:vault', targetVaultId);
      }
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason !== 'io client disconnect') {
        setConnectionError(`Connection lost: ${reason}`);
      }
    });

    socket.on('reconnect', (attempt) => {
      reconnectAttemptsRef.current = attempt;
      setConnectionError(null);
      // Re-subscribe on reconnect
      if (targetVaultId) {
        socket.emit('subscribe:vault', targetVaultId);
      }
    });

    socket.on('reconnect_attempt', (attempt) => {
      reconnectAttemptsRef.current = attempt;
    });

    socket.on('reconnect_error', (error) => {
      setConnectionError(`Reconnection failed: ${error.message || 'Unknown error'}`);
    });

    socket.on('connect_error', (error) => {
      setConnectionError(error.message || 'Connection error');
    });

    socket.on('vault:activity:global', (event: VaultActivityEvent) => {
      addActivity(event);
    });

    // Vault-specific channel for individual vault activity
    socket.on('vault:activity', (event: VaultActivityEvent) => {
      addActivity(event);
    });

    // Vault-specific channel: vault:{id}:activity
    if (targetVaultId) {
      socket.on(`vault:${targetVaultId}:activity`, (event: VaultActivityEvent) => {
        addActivity(event);
      });
    }

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const subscribeToVault = useCallback((vaultId: string) => {
    socketRef.current?.emit('subscribe:vault', vaultId);
  }, []);

  const unsubscribeFromVault = useCallback((vaultId: string) => {
    socketRef.current?.emit('unsubscribe:vault', vaultId);
  }, []);

  const clearActivities = useCallback(() => {
    setActivities([]);
    setLatestEvent(null);
  }, []);

  return {
    isConnected,
    activities,
    latestEvent,
    isPaused,
    connectionError,
    reconnectAttempts: reconnectAttemptsRef.current,
    togglePause,
    subscribeToVault,
    unsubscribeFromVault,
    clearActivities,
  };
}
