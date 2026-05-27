import { useState, useEffect, useCallback, useRef } from 'react';
import { db, VaultData, TransactionData, AIRecommendation, OfflineAction } from '@/lib/db';
import { syncManager, SyncStatus, NetworkStatus } from '@/lib/db';
import { useAuthStore } from '@/lib/stores/auth-store';

export interface UseOfflineDataReturn {
  isOnline: boolean;
  isSyncing: boolean;
  networkStatus: NetworkStatus | null;
  syncStatus: SyncStatus;
  pendingActions: number;
  lastSyncAt: string | null;
  vaults: VaultData[];
  transactions: TransactionData[];
  recommendations: AIRecommendation[];
  cacheVaultData: (vault: VaultData) => Promise<void>;
  cacheTransaction: (tx: TransactionData) => Promise<void>;
  cacheRecommendations: (recs: AIRecommendation[]) => Promise<void>;
  triggerSync: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function useOfflineData(): UseOfflineDataReturn {
  const { token } = useAuthStore();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'idle' });
  const [pendingActions, setPendingActions] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [vaults, setVaults] = useState<VaultData[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribeNetwork = syncManager.subscribeToNetwork(setNetworkStatus);
    const unsubscribeSync = syncManager.subscribe((status) => {
      setSyncStatus(status);
      setIsSyncing(status.status === 'syncing');
      if (status.lastSyncAt) {
        setLastSyncAt(status.lastSyncAt);
      }
    });

    syncManager.startPeriodicSync(30000);
    void loadCachedData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeNetwork();
      unsubscribeSync();
      syncManager.stopPeriodicSync();
    };
  }, []);

  const loadCachedData = async (): Promise<void> => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const [cachedVaults, cachedTransactions, cachedRecommendations] = await Promise.all([
      db.vaults.toArray(),
      db.transactions.orderBy('timestamp').reverse().limit(50).toArray(),
      db.aiRecommendations.toArray(),
    ]);

    const pendingCount = await db.offlineQueue.where('status').equals('pending').count();
    
    setVaults(cachedVaults);
    setTransactions(cachedTransactions);
    setRecommendations(cachedRecommendations);
    setPendingActions(pendingCount);
  };

  const cacheVaultData = useCallback(async (vault: VaultData): Promise<void> => {
    await db.vaults.put({ ...vault, updatedAt: new Date().toISOString() });
    setVaults(prev => {
      const idx = prev.findIndex(v => v.id === vault.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...vault, updatedAt: new Date().toISOString() };
        return updated;
      }
      return [...prev, vault];
    });
  }, []);

  const cacheTransaction = useCallback(async (tx: TransactionData): Promise<void> => {
    const txWithMeta = { ...tx, pendingSync: true, localOnly: true };
    await db.transactions.put(txWithMeta);
    setTransactions(prev => [txWithMeta, ...prev].slice(0, 50));
  }, []);

  const cacheRecommendations = useCallback(async (recs: AIRecommendation[]): Promise<void> => {
    const now = new Date().toISOString();
    const recsWithMeta = recs.map(r => ({ ...r, syncedAt: now }));
    await db.aiRecommendations.bulkPut(recsWithMeta);
    setRecommendations(recsWithMeta);
  }, []);

  const fetchFreshData = useCallback(async (): Promise<void> => {
    if (!token) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [vaultsRes, txRes, recRes] = await Promise.all([
        fetch(`${API_BASE}/vaults`, { headers }),
        fetch(`${API_BASE}/transactions`, { headers }),
        fetch(`${API_BASE}/ai-assistant/recommend`, { headers }),
      ]);

      if (vaultsRes.ok) {
        const freshVaults: VaultData[] = await vaultsRes.json();
        const syncedVaults = freshVaults.map(v => ({ ...v, syncedAt: new Date().toISOString() }));
        await db.vaults.bulkPut(syncedVaults);
        setVaults(syncedVaults);
      }

      if (txRes.ok) {
        const freshTx: TransactionData[] = await txRes.json();
        const syncedTx = freshTx.map(t => ({ ...t, syncedAt: new Date().toISOString() }));
        await db.transactions.bulkPut(syncedTx);
        setTransactions(syncedTx.slice(0, 50));
      }

      if (recRes.ok) {
        const freshRecs: AIRecommendation[] = await recRes.json();
        const syncedRecs = freshRecs.map(r => ({ ...r, syncedAt: new Date().toISOString() }));
        await db.aiRecommendations.bulkPut(syncedRecs);
        setRecommendations(syncedRecs);
      }
    } catch {
      // Fail silently - we have cached data
    }
  }, [token]);

  const triggerSync = useCallback(async (): Promise<void> => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      await syncManager.triggerSync();
      const pendingCount = await db.offlineQueue.where('status').equals('pending').count();
      setPendingActions(pendingCount);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  const refreshData = useCallback(async (): Promise<void> => {
    if (isOnline) {
      await fetchFreshData();
    } else {
      await loadCachedData();
    }
  }, [isOnline, fetchFreshData]);

  return {
    isOnline,
    isSyncing,
    networkStatus,
    syncStatus,
    pendingActions,
    lastSyncAt,
    vaults,
    transactions,
    recommendations,
    cacheVaultData,
    cacheTransaction,
    cacheRecommendations,
    triggerSync,
    refreshData,
  };
}

export function useOfflineIndicator(): { isOnline: boolean; pendingCount: number } {
  const [state, setState] = useState({ isOnline: true, pendingCount: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setState({ isOnline: navigator.onLine, pendingCount: 0 });

    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    db.offlineQueue.where('status').equals('pending').count().then((count: number) => {
      setState(prev => ({ ...prev, pendingCount: count }));
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return state;
}