import Dexie, { type Table } from 'dexie';
import type { SeasonalTipsResponse } from '@/lib/api/seasonal-tips';
import type { ChatEntry } from '@/types/ai-chat';

export type VaultIconKey = 'coins' | 'zap' | 'leaf' | 'shield' | 'database' | 'trending';

export interface StoredVault {
  id: string;
  name: string;
  asset: string;
  apy: string;
  tvl: string;
  balance: string;
  walletBalance: string;
  iconKey: VaultIconKey;
}

export interface SyncQueueRow {
  id: string;
  kind: 'chat' | 'progress' | 'custom';
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface ClientMetaRow {
  key: 'clientId' | 'lastSyncAt';
  value: string;
}

class HarvestOfflineDB extends Dexie {
  meta!: Table<ClientMetaRow, string>;
  seasonalTips!: Table<{ id: string; response: SeasonalTipsResponse; updatedAt: number }, string>;
  vaults!: Table<{ id: string; vaults: StoredVault[]; updatedAt: number }, string>;
  aiChat!: Table<{ id: string; messages: ChatEntry[]; suggestions: string[]; updatedAt: number }, string>;
  aiInsights!: Table<{ id: string; summary: string; suggestions: string[]; updatedAt: number }, string>;
  syncQueue!: Table<SyncQueueRow, string>;

  constructor() {
    super('harvest-finance-offline');
    this.version(1).stores({
      meta: 'key',
      seasonalTips: 'id, updatedAt',
      vaults: 'id, updatedAt',
      aiChat: 'id, updatedAt',
      aiInsights: 'id, updatedAt',
      syncQueue: 'id, createdAt',
    });
  }
}

export const offlineDb = new HarvestOfflineDB();

const TIPS_KEY = 'latest';
const VAULTS_KEY = 'dashboard';
const AI_KEY = 'session';

export async function getOrCreateClientId(): Promise<string> {
  const row = await offlineDb.meta.get('clientId');
  if (row?.value) return row.value;
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await offlineDb.meta.put({ key: 'clientId', value: id });
  return id;
}

export async function getLastSyncAt(): Promise<number> {
  const row = await offlineDb.meta.get('lastSyncAt');
  return row?.value ? parseInt(row.value, 10) : 0;
}

export async function setLastSyncAt(ts: number): Promise<void> {
  await offlineDb.meta.put({ key: 'lastSyncAt', value: String(ts) });
}

export async function saveSeasonalTipsCache(
  response: SeasonalTipsResponse,
): Promise<void> {
  await offlineDb.seasonalTips.put({
    id: TIPS_KEY,
    response,
    updatedAt: Date.now(),
  });
}

export async function loadSeasonalTipsCache(): Promise<SeasonalTipsResponse | null> {
  const row = await offlineDb.seasonalTips.get(TIPS_KEY);
  return row?.response ?? null;
}

export async function saveVaultsCache(vaults: StoredVault[]): Promise<void> {
  await offlineDb.vaults.put({
    id: VAULTS_KEY,
    vaults,
    updatedAt: Date.now(),
  });
}

export async function loadVaultsCache(): Promise<StoredVault[] | null> {
  const row = await offlineDb.vaults.get(VAULTS_KEY);
  return row?.vaults ?? null;
}

export async function saveAiSession(
  messages: ChatEntry[],
  suggestions: string[],
): Promise<void> {
  await offlineDb.aiChat.put({
    id: AI_KEY,
    messages,
    suggestions,
    updatedAt: Date.now(),
  });
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  if (lastAssistant) {
    await offlineDb.aiInsights.put({
      id: 'latest',
      summary: lastAssistant.content.slice(0, 2000),
      suggestions: lastAssistant.suggestions?.length
        ? lastAssistant.suggestions
        : suggestions,
      updatedAt: Date.now(),
    });
  }
}

export async function loadAiSession(): Promise<{
  messages: ChatEntry[];
  suggestions: string[];
} | null> {
  const row = await offlineDb.aiChat.get(AI_KEY);
  if (!row) return null;
  return { messages: row.messages, suggestions: row.suggestions };
}

export async function loadAiInsights(): Promise<{
  summary: string;
  suggestions: string[];
} | null> {
  const row = await offlineDb.aiInsights.get('latest');
  if (!row) return null;
  return { summary: row.summary, suggestions: row.suggestions };
}

export async function enqueueSyncItem(
  kind: SyncQueueRow['kind'],
  payload: Record<string, unknown>,
): Promise<void> {
  const id = `q-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await offlineDb.syncQueue.add({
    id,
    kind,
    payload,
    createdAt: Date.now(),
  });
}

export async function clearSyncQueue(): Promise<void> {
  await offlineDb.syncQueue.clear();
}

export async function peekSyncQueue(): Promise<SyncQueueRow[]> {
  return offlineDb.syncQueue.orderBy('createdAt').toArray();
}
