import axios from 'axios';
import {
  offlineDb,
  getOrCreateClientId,
  getLastSyncAt,
  setLastSyncAt,
  clearSyncQueue,
  peekSyncQueue,
  saveSeasonalTipsCache,
  saveVaultsCache,
  saveAiSession,
  type StoredVault,
} from './db';
import type { SeasonalTipsResponse } from '@/lib/api/seasonal-tips';
import type { ChatEntry } from '@/types/ai-chat';

function normalizeChatEntries(messages: ChatEntry[]): ChatEntry[] {
  return messages.map((m) => {
    const raw = m as unknown as { timestamp?: Date | string };
    const ts =
      raw.timestamp instanceof Date
        ? raw.timestamp
        : new Date(String(raw.timestamp ?? Date.now()));
    return { ...m, timestamp: ts };
  });
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const syncClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

export interface SyncPayload {
  clientId: string;
  lastSyncAt: number;
  seasonalTips: SeasonalTipsResponse | null;
  seasonalTipsAt: number;
  vaults: StoredVault[] | null;
  vaultsAt: number;
  ai: { messages: ChatEntry[]; suggestions: string[] } | null;
  aiAt: number;
  queued: Array<{ kind: string; payload: Record<string, unknown>; createdAt: number }>;
}

export async function collectLocalPayload(): Promise<SyncPayload> {
  const clientId = await getOrCreateClientId();
  const lastSyncAt = await getLastSyncAt();
  const queued = (await peekSyncQueue()).map((q) => ({
    kind: q.kind,
    payload: q.payload,
    createdAt: q.createdAt,
  }));
  const tipsRow = await offlineDb.seasonalTips.get('latest');
  const vaultsRow = await offlineDb.vaults.get('dashboard');
  const aiRow = await offlineDb.aiChat.get('session');

  const tips = tipsRow?.response ?? null;
  const vaults = vaultsRow?.vaults ?? null;
  const ai = aiRow
    ? { messages: aiRow.messages, suggestions: aiRow.suggestions }
    : null;

  return {
    clientId,
    lastSyncAt,
    seasonalTips: tips,
    seasonalTipsAt: tipsRow?.updatedAt ?? 0,
    vaults,
    vaultsAt: vaultsRow?.updatedAt ?? 0,
    ai,
    aiAt: aiRow?.updatedAt ?? 0,
    queued,
  };
}

export async function pushSync(): Promise<{ ok: boolean; serverTime: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, serverTime: Date.now() };
  }

  const body = await collectLocalPayload();

  try {
    const { data } = await syncClient.post<{
      merged: Partial<{
        seasonalTips: SeasonalTipsResponse;
        vaults: StoredVault[];
        ai: { messages: ChatEntry[]; suggestions: string[] };
      }>;
      serverTime: number;
    }>('/api/v1/sync', body);

    const t = data.serverTime ?? Date.now();
    await setLastSyncAt(t);

    if (data.merged?.seasonalTips) {
      await saveSeasonalTipsCache(data.merged.seasonalTips);
    }
    if (data.merged?.vaults?.length) {
      await saveVaultsCache(data.merged.vaults);
    }
    if (data.merged?.ai?.messages?.length) {
      await saveAiSession(
        normalizeChatEntries(data.merged.ai.messages),
        data.merged.ai.suggestions || [],
      );
    }

    await clearSyncQueue();

    return { ok: true, serverTime: t };
  } catch {
    return { ok: false, serverTime: Date.now() };
  }
}
