import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import axios, { AxiosInstance } from 'axios';
import {
  SorobanEvent,
  SorobanEventType,
} from '../database/entities/soroban-event.entity';
import {
  QuerySorobanEventsDto,
  IndexerStatusDto,
  SorobanEventPageDto,
} from './dto/soroban-events.dto';

interface RpcContractEvent {
  id: string;
  type: 'contract' | 'system' | 'diagnostic';
  ledger: number;
  ledgerClosedAt: string;
  contractId?: string;
  pagingToken: string;
  topic?: string[];
  value?: unknown;
  inSuccessfulContractCall?: boolean;
  txHash?: string;
}

interface RpcGetEventsResponse {
  events: RpcContractEvent[];
  latestLedger: number;
}

@Injectable()
export class SorobanIndexerService implements OnModuleInit {
  private readonly logger = new Logger(SorobanIndexerService.name);
  private readonly enabled: boolean;
  private readonly rpcUrl: string;
  private readonly pageSize: number;
  private readonly filterContractIds: string[];
  private readonly http: AxiosInstance;

  private lastIndexedLedger: number | null = null;
  private lastPolledAt: Date | null = null;
  private running = false;

  constructor(
    @InjectRepository(SorobanEvent)
    private readonly eventRepository: Repository<SorobanEvent>,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.enabled =
      this.config.get<string>('SOROBAN_INDEXER_ENABLED', 'false') === 'true';
    const network = this.config.get<string>('STELLAR_NETWORK', 'testnet');
    const defaultUrl =
      network === 'mainnet'
        ? 'https://soroban-rpc.mainnet.stellar.gateway.fm'
        : 'https://soroban-testnet.stellar.org';
    this.rpcUrl = this.config.get<string>('SOROBAN_RPC_URL', defaultUrl);
    this.pageSize = Math.min(
      Math.max(
        parseInt(
          this.config.get<string>('SOROBAN_INDEXER_PAGE_SIZE', '100'),
          10,
        ),
        1,
      ),
      1000,
    );
    const ids = this.config
      .get<string>('SOROBAN_INDEXER_CONTRACT_IDS', '')
      .trim();
    this.filterContractIds = ids
      ? ids
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    this.http = axios.create({
      baseURL: this.rpcUrl,
      timeout: 15_000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const latest = await this.eventRepository
        .createQueryBuilder('e')
        .select('MAX(e.ledger)', 'maxLedger')
        .getRawOne<{ maxLedger: string | null }>();
      this.lastIndexedLedger = latest?.maxLedger
        ? parseInt(latest.maxLedger, 10)
        : null;
      this.logger.log(
        `Soroban indexer initialised | enabled=${this.enabled} rpc=${this.rpcUrl} lastLedger=${this.lastIndexedLedger ?? 'none'}`,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to resolve last indexed ledger (table may not yet exist): ${(err as Error).message}`,
      );
    }
  }

  /**
   * Polls the Soroban RPC for new ContractEvents and persists them.
   * Runs every 30s while `SOROBAN_INDEXER_ENABLED=true`.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async pollEvents(): Promise<void> {
    if (!this.enabled || this.running) return;
    this.running = true;
    try {
      const result = await this.runOnce();
      if (result.saved > 0) {
        this.logger.log(
          `Indexed ${result.saved} Soroban events (lastLedger=${this.lastIndexedLedger}, latest=${result.latestLedger})`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Soroban indexer poll failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    } finally {
      this.lastPolledAt = new Date();
      this.running = false;
    }
  }

  /**
   * Executes a single poll iteration. Exposed for tests and manual triggers.
   */
  async runOnce(): Promise<{ saved: number; latestLedger: number | null }> {
    const startLedger = await this.resolveStartLedger();
    const response = await this.fetchEvents(startLedger);

    if (!response.events.length) {
      return { saved: 0, latestLedger: response.latestLedger };
    }

    const entities = response.events.map((ev) => this.toEntity(ev));
    const saved = await this.persist(entities);
    const maxLedgerInBatch = entities.reduce(
      (max, e) => (e.ledger > max ? e.ledger : max),
      this.lastIndexedLedger ?? 0,
    );
    this.lastIndexedLedger = maxLedgerInBatch;

    return { saved, latestLedger: response.latestLedger };
  }

  private async resolveStartLedger(): Promise<number> {
    if (this.lastIndexedLedger && this.lastIndexedLedger > 0) {
      return this.lastIndexedLedger + 1;
    }

    // Bootstrap from getLatestLedger - N so we don't attempt to replay history.
    try {
      const latest = await this.rpcCall<{ sequence: number }>(
        'getLatestLedger',
        {},
      );
      const backoff = parseInt(
        this.config.get<string>('SOROBAN_INDEXER_BOOTSTRAP_LEDGERS', '120'),
        10,
      );
      return Math.max(latest.sequence - backoff, 1);
    } catch {
      return 1;
    }
  }

  private async fetchEvents(
    startLedger: number,
  ): Promise<RpcGetEventsResponse> {
    const filters: Record<string, unknown> = { type: 'contract' };
    if (this.filterContractIds.length > 0) {
      filters.contractIds = this.filterContractIds;
    }

    return this.rpcCall<RpcGetEventsResponse>('getEvents', {
      startLedger,
      filters: [filters],
      pagination: { limit: this.pageSize },
    });
  }

  private async rpcCall<T>(method: string, params: unknown): Promise<T> {
    const cacheKey = `soroban:rpc:${method}:${JSON.stringify(params)}`;
    const cached = await this.cacheManager.get<T>(cacheKey);
    if (cached) {
      return cached;
    }

    const { data } = await this.http.post('', {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    });
    if (data.error) {
      throw new Error(
        `Soroban RPC error: ${data.error.code} ${data.error.message ?? 'unknown'}`,
      );
    }

    const result = data.result as T;
    // Cache for 5 minutes by default
    await this.cacheManager.set(cacheKey, result, 300 * 1000);
    return result;
  }

  private toEntity(ev: RpcContractEvent): SorobanEvent {
    const entity = new SorobanEvent();
    entity.eventId = ev.id;
    entity.type = (ev.type as SorobanEventType) ?? SorobanEventType.CONTRACT;
    entity.contractId = ev.contractId ?? null;
    entity.ledger = ev.ledger;
    entity.ledgerClosedAt = ev.ledgerClosedAt
      ? new Date(ev.ledgerClosedAt)
      : new Date();
    entity.transactionHash = ev.txHash ?? null;
    entity.pagingToken = ev.pagingToken ?? ev.id;
    entity.topics = ev.topic ?? [];
    entity.value = ev.value ?? null;
    entity.inSuccessfulContractCall = ev.inSuccessfulContractCall ?? true;
    return entity;
  }

  private async persist(entities: SorobanEvent[]): Promise<number> {
    if (entities.length === 0) return 0;
    // Use upsert on event_id so reprocessing the same RPC window is idempotent.
    const result = await this.eventRepository
      .createQueryBuilder()
      .insert()
      .into(SorobanEvent)
      .values(entities as any)
      .orIgnore()
      .execute();
    return result.identifiers.filter((id) => id !== undefined).length;
  }

  async query(filter: QuerySorobanEventsDto): Promise<SorobanEventPageDto> {
    const skip = filter.skip ?? 0;
    const limit = Math.min(filter.limit ?? 50, 200);

    // Keep DB indexes aligned with these predicates and sort keys:
    // contract_id, type, ledger, and paging_token.
    const where: FindOptionsWhere<SorobanEvent> = {};
    if (filter.contractId) where.contractId = filter.contractId;
    if (filter.type) where.type = filter.type;
    if (filter.fromLedger != null && filter.toLedger != null) {
      where.ledger = Between(filter.fromLedger, filter.toLedger);
    }

    const [items, total] = await this.eventRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { ledger: 'DESC', pagingToken: 'DESC' },
    });

    return { items: items as any, total, skip, limit };
  }

  async status(): Promise<IndexerStatusDto> {
    const totalEvents = await this.eventRepository.count();
    return {
      enabled: this.enabled,
      rpcUrl: this.rpcUrl,
      lastLedger: this.lastIndexedLedger,
      totalEvents,
      lastPolledAt: this.lastPolledAt ? this.lastPolledAt.toISOString() : null,
    };
  }

  /**
   * Ingests a chain event pushed by an external webhook provider.
   * Uses the same idempotent upsert path as the background indexer.
   */
  async ingestExternalEvent(event: {
    eventId: string;
    type: SorobanEventType;
    contractId?: string;
    ledger: number;
    ledgerClosedAt: string;
    transactionHash?: string;
    pagingToken: string;
    topics?: string[];
    value?: unknown;
    inSuccessfulContractCall?: boolean;
  }): Promise<{ stored: boolean }> {
    const entity = new SorobanEvent();
    entity.eventId = event.eventId;
    entity.type = event.type;
    entity.contractId = event.contractId ?? null;
    entity.ledger = event.ledger;
    entity.ledgerClosedAt = new Date(event.ledgerClosedAt);
    entity.transactionHash = event.transactionHash ?? null;
    entity.pagingToken = event.pagingToken;
    entity.topics = event.topics ?? [];
    entity.value = event.value ?? null;
    entity.inSuccessfulContractCall = event.inSuccessfulContractCall ?? true;

    const stored = await this.persist([entity]);
    if (stored > 0 && entity.ledger > (this.lastIndexedLedger ?? 0)) {
      this.lastIndexedLedger = entity.ledger;
    }

    return { stored: stored > 0 };
  }

  /**
   * Get the latest ledger from the Soroban RPC
   */
  async getLatestLedger(): Promise<number> {
    const result = await this.rpcCall<{ sequence: number }>(
      'getLatestLedger',
      {},
    );
    return result.sequence;
  }

  /**
   * Get ledger entries (storage entries) from the Soroban RPC
   */
  async getLedgerEntries(keys: string[]): Promise<{ entries: any[] }> {
    const cacheKey = `soroban:rpc:getLedgerEntries:${JSON.stringify(keys)}`;
    const cached = await this.cacheManager.get<{ entries: any[] }>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.rpcCall<{ entries: any[] }>('getLedgerEntries', {
      keys,
    });
    await this.cacheManager.set(cacheKey, result, 60 * 1000);
    return result;
  }
}
