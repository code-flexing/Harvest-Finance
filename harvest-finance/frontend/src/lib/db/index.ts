import Dexie, { type Table } from 'dexie';

export interface VaultData {
  id: string;
  name: string;
  balance: number;
  totalDeposits: number;
  totalRewards: number;
  targetAmount: number;
  cropType: string;
  status: 'active' | 'pending' | 'completed';
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  localOnly?: boolean;
}

export interface TransactionData {
  id: string;
  vaultId: string;
  type: 'deposit' | 'withdraw' | 'reward' | 'transfer';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  syncedAt?: string;
  localOnly?: boolean;
  pendingSync?: boolean;
  retryCount?: number;
}

export interface AIRecommendation {
  id: string;
  category: 'crop' | 'soil' | 'weather' | 'market' | 'general';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  actionUrl?: string;
  createdAt: string;
  expiresAt: string;
  syncedAt?: string;
}

export interface OfflineAction {
  id: string;
  type: 'deposit' | 'withdraw' | 'ai-query' | 'update-profile' | 'sync-request';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  retryCount: number;
  lastError?: string;
  priority: number;
}

export class HarvestFinanceDB extends Dexie {
  vaults!: Table<VaultData, string>;
  transactions!: Table<TransactionData, string>;
  aiRecommendations!: Table<AIRecommendation, string>;
  offlineQueue!: Table<OfflineAction, string>;

  constructor() {
    super('HarvestFinanceDB');

    this.version(1).stores({
      vaults: 'id, name, status, updatedAt, syncedAt, localOnly',
      transactions: 'id, vaultId, type, status, timestamp, syncedAt, pendingSync',
      aiRecommendations: 'id, category, priority, createdAt, expiresAt, syncedAt',
      offlineQueue: 'id, type, status, createdAt, priority, [status+priority]',
    });
  }
}

export const db = new HarvestFinanceDB();

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });
}

export async function getSyncStatus(): Promise<{
  pendingCount: number;
  failedCount: number;
  lastSync: string | null;
}> {
  const pending = await db.offlineQueue.where('status').equals('pending').count();
  const failed = await db.offlineQueue.where('status').equals('failed').count();
  
  return {
    pendingCount: pending,
    failedCount: failed,
    lastSync: null,
  };
}

export async function removeExpiredAIRecommendations(): Promise<void> {
  const now = new Date().toISOString();
  const expired = await db.aiRecommendations
    .where('expiresAt')
    .below(now)
    .toArray();
  
  if (expired.length > 0) {
    await db.aiRecommendations.bulkDelete(expired.map(r => r.id));
  }
}

removeExpiredAIRecommendations().catch(() => {});