import { db, OfflineAction } from './index';
import { useAuthStore } from '@/lib/stores/auth-store';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  conflicts: SyncConflict[];
}

export interface SyncConflict {
  entityType: string;
  entityId: string;
  localVersion: Record<string, unknown>;
  serverVersion: Record<string, unknown>;
  resolution: 'local-wins' | 'server-wins' | 'merge' | 'manual';
  resolvedAt?: string;
}

export interface NetworkStatus {
  isOnline: boolean;
  connectionType: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class OfflineSyncManager {
  private isSyncing = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private networkListeners: Set<(status: NetworkStatus) => void> = new Set();
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initNetworkListeners();
    }
  }

  private initNetworkListeners(): void {
    const updateNetworkStatus = () => {
      const nav = navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number } };
      const status: NetworkStatus = {
        isOnline: navigator.onLine,
        connectionType: nav.connection?.effectiveType ?? null,
        effectiveType: nav.connection?.effectiveType ?? null,
        downlink: nav.connection?.downlink ?? null,
        rtt: nav.connection?.rtt ?? null,
      };
      
      this.networkListeners.forEach(listener => listener(status));
      
      if (navigator.onLine) {
        void this.triggerSync();
      }
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToNetwork(listener: (status: NetworkStatus) => void): () => void {
    this.networkListeners.add(listener);
    return () => this.networkListeners.delete(listener);
  }

  private notifyListeners(status: SyncStatus): void {
    this.listeners.forEach(listener => listener(status));
  }

  startPeriodicSync(intervalMs = 30000): void {
    this.stopPeriodicSync();
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        void this.triggerSync();
      }
    }, intervalMs);
  }

  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async triggerSync(): Promise<SyncResult> {
    if (this.isSyncing || !navigator.onLine) {
      return { success: false, syncedCount: 0, failedCount: 0, conflicts: [] };
    }

    this.isSyncing = true;
    this.notifyListeners({ status: 'syncing', progress: 0 });

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      conflicts: [],
    };

    try {
      await this.syncOfflineQueue(result);
      result.success = result.failedCount === 0;
      
      this.notifyListeners({
        status: result.success ? 'success' : 'partial',
        progress: 100,
        lastSyncAt: new Date().toISOString(),
      });
    } catch (error) {
      result.success = false;
      this.notifyListeners({ status: 'failed', error: String(error) });
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  private async syncOfflineQueue(result: SyncResult): Promise<void> {
    const pendingActions = await db.offlineQueue
      .where('status')
      .equals('pending')
      .sortBy('priority');

    for (const action of pendingActions) {
      await db.offlineQueue.update(action.id, { status: 'syncing' });

      try {
        const response = await this.makeRequest(
          action.endpoint.replace(API_BASE, ''),
          action.method,
          action.payload,
          action.headers
        );

        if (response.ok) {
          await db.offlineQueue.update(action.id, { status: 'completed' });
          await db.offlineQueue.delete(action.id);
          result.syncedCount++;
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Unknown error';
        await db.offlineQueue.update(action.id, {
          status: 'failed',
          lastError: err,
          retryCount: action.retryCount + 1,
        });
        result.failedCount++;
      }
    }
  }

  private async makeRequest(
    endpoint: string,
    method: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<Response> {
    const token = useAuthStore.getState().token;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    };

    return fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: defaultHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async queueOfflineAction(
    type: OfflineAction['type'],
    endpoint: string,
    method: OfflineAction['method'],
    payload: Record<string, unknown>,
    priority = 0,
    headers?: Record<string, string>
  ): Promise<void> {
    const action: OfflineAction = {
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      endpoint: `${API_BASE}${endpoint}`,
      method,
      payload,
      headers,
      createdAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
      priority,
    };

    await db.offlineQueue.add(action);

    if (navigator.onLine) {
      void this.triggerSync();
    }
  }

  async getPendingActions(): Promise<OfflineAction[]> {
    return db.offlineQueue.where('status').equals('pending').sortBy('priority');
  }
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'failed' | 'partial';
  progress?: number;
  lastSyncAt?: string;
  error?: string;
}

export const syncManager = new OfflineSyncManager();