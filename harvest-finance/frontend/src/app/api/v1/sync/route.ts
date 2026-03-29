import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { SeasonalTipsResponse } from '@/lib/api/seasonal-tips';
import type { ChatEntry } from '@/types/ai-chat';

interface StoredVault {
  id: string;
  name: string;
  asset: string;
  apy: string;
  tvl: string;
  balance: string;
  walletBalance: string;
  iconKey: string;
}

interface SyncBody {
  clientId: string;
  lastSyncAt: number;
  seasonalTips: SeasonalTipsResponse | null;
  seasonalTipsAt?: number;
  vaults: StoredVault[] | null;
  vaultsAt?: number;
  ai: { messages: ChatEntry[]; suggestions: string[] } | null;
  aiAt?: number;
  queued: Array<{ kind: string; payload: Record<string, unknown>; createdAt: number }>;
}

interface ServerState {
  seasonalTips: SeasonalTipsResponse | null;
  seasonalTipsUpdatedAt: number;
  vaults: StoredVault[] | null;
  vaultsUpdatedAt: number;
  ai: { messages: ChatEntry[]; suggestions: string[] } | null;
  aiUpdatedAt: number;
}

const DATA_FILE = 'offline-sync-state.json';

function lww<T>(
  client: T | null,
  clientTs: number,
  server: T | null,
  serverTs: number,
): { value: T | null; ts: number } {
  if (!client && !server) return { value: null, ts: 0 };
  if (!server) return { value: client, ts: clientTs || Date.now() };
  if (!client) return { value: server, ts: serverTs };
  return clientTs >= serverTs ? { value: client, ts: clientTs } : { value: server, ts: serverTs };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncBody;
    const dataDir = path.resolve(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });
    const filePath = path.join(dataDir, DATA_FILE);

    let server: ServerState = {
      seasonalTips: null,
      seasonalTipsUpdatedAt: 0,
      vaults: null,
      vaultsUpdatedAt: 0,
      ai: null,
      aiUpdatedAt: 0,
    };

    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      server = { ...server, ...parsed };
    } catch {
      // fresh file
    }

    const now = Date.now();
    const clientTipsTs = body.seasonalTips
      ? (body.seasonalTipsAt ?? body.lastSyncAt ?? now)
      : 0;
    const tipsMerge = lww(
      body.seasonalTips,
      clientTipsTs,
      server.seasonalTips,
      server.seasonalTipsUpdatedAt,
    );

    const vaultTs = body.vaults?.length
      ? (body.vaultsAt ?? body.lastSyncAt ?? now)
      : 0;
    const vaultMerge = lww(body.vaults, vaultTs, server.vaults, server.vaultsUpdatedAt);

    const aiTs = body.ai?.messages?.length
      ? (body.aiAt ?? body.lastSyncAt ?? now)
      : 0;
    const aiMerge = lww(body.ai, aiTs, server.ai, server.aiUpdatedAt);

    const next: ServerState = {
      seasonalTips: tipsMerge.value as SeasonalTipsResponse | null,
      seasonalTipsUpdatedAt: tipsMerge.ts,
      vaults: vaultMerge.value as StoredVault[] | null,
      vaultsUpdatedAt: vaultMerge.ts,
      ai: aiMerge.value as { messages: ChatEntry[]; suggestions: string[] } | null,
      aiUpdatedAt: aiMerge.ts,
    };

    await fs.writeFile(filePath, JSON.stringify(next, null, 2), 'utf8');

    return NextResponse.json({
      merged: {
        seasonalTips: next.seasonalTips,
        vaults: next.vaults,
        ai: next.ai,
      },
      serverTime: now,
      queuedProcessed: (body.queued || []).length,
    });
  } catch (e) {
    console.error('sync error', e);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
