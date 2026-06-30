import { Test, TestingModule } from '@nestjs/testing';
import { Cache } from 'cache-manager';
import { SorobanIndexerService } from '../soroban-indexer.service';
import {
  SorobanEvent,
  SorobanEventType,
} from '../../database/entities/soroban-event.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { IndexerState } from '../../database/entities/indexer-state.entity';

describe('SorobanIndexerService - Filter handling', () => {
  let module: TestingModule;
  let service: SorobanIndexerService;
  let repo: Repository<SorobanEvent>;

  const mockCache: Partial<Cache> = {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfig = {
    get: jest.fn((key: string, def?: string) => {
      switch (key) {
        case 'SOROBAN_INDEXER_ENABLED':
          return 'false';
        case 'STELLAR_NETWORK':
          return 'testnet';
        default:
          return def ?? null;
      }
    }),
  };

  beforeAll(async () => {
    // in-memory dataset and mocked repository to avoid DB dependencies
    const data: SorobanEvent[] = [];
    const mockRepo: Partial<Record<string, any>> = {
      findAndCount: jest.fn(async (opts: any) => {
        let items = data.slice();
        const where = opts?.where ?? {};
        if (where.contractId)
          items = items.filter((e) => e.contractId === where.contractId);
        if (where.type) items = items.filter((e) => e.type === where.type);

        if (where.ledger) {
          // Handle several possible shapes for Between(...) operator
          let min: number | undefined;
          let max: number | undefined;
          const w = where.ledger;
          if (Array.isArray(w) && w.length === 2) {
            [min, max] = w;
          } else if (w && typeof w === 'object') {
            if (Array.isArray(w._value)) [min, max] = w._value;
            else if (Array.isArray(w.value)) [min, max] = w.value;
            else if (w.low !== undefined && w.high !== undefined) {
              min = w.low;
              max = w.high;
            }
          }
          if (min !== undefined && max !== undefined) {
            items = items.filter((e) => e.ledger >= min && e.ledger <= max);
          }
        }

        // order deterministic: ledger desc, pagingToken desc
        items.sort((a, b) => {
          if (b.ledger !== a.ledger) return b.ledger - a.ledger;
          return (b.pagingToken ?? '').localeCompare(a.pagingToken ?? '');
        });

        const skip = opts?.skip ?? 0;
        const take = opts?.take ?? items.length;
        const sliced = items.slice(skip, skip + take);
        return [sliced, items.length];
      }),
      save: jest.fn(async (entities: SorobanEvent[]) => {
        data.push(...entities);
        return entities;
      }),
      clear: jest.fn(async () => {
        data.length = 0;
      }),
      count: jest.fn(async () => data.length),
    };

    module = await Test.createTestingModule({
      providers: [
        SorobanIndexerService,
        { provide: getRepositoryToken(SorobanEvent), useValue: mockRepo },
        { provide: getRepositoryToken(IndexerState), useValue: { findOne: jest.fn(), find: jest.fn() } },
        { provide: ConfigService, useValue: mockConfig },
        { provide: 'CACHE_MANAGER', useValue: mockCache },
        { provide: DataSource, useValue: { transaction: jest.fn().mockImplementation(async (cb: any) => cb({})) } },
      ],
    }).compile();

    service = module.get<SorobanIndexerService>(SorobanIndexerService);
    repo = module.get(getRepositoryToken(SorobanEvent));
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await (repo.clear as any)();
  });

  function makeEvent(overrides: Partial<SorobanEvent>): SorobanEvent {
    const ev = new SorobanEvent();
    ev.eventId =
      overrides.eventId ?? `evt-${Math.random().toString(36).slice(2)}`;
    ev.type = overrides.type ?? SorobanEventType.CONTRACT;
    ev.contractId = overrides.contractId ?? null;
    ev.ledger = overrides.ledger ?? 1;
    ev.ledgerClosedAt = overrides.ledgerClosedAt ?? new Date();
    ev.transactionHash = overrides.transactionHash ?? null;
    ev.pagingToken = overrides.pagingToken ?? ev.eventId;
    ev.topics = overrides.topics ?? [];
    ev.value = overrides.value ?? null;
    ev.inSuccessfulContractCall = overrides.inSuccessfulContractCall ?? true;
    return ev;
  }

  it('filters by contractId only', async () => {
    const a1 = makeEvent({ contractId: 'C1', ledger: 10 });
    const a2 = makeEvent({ contractId: 'C1', ledger: 20 });
    const b1 = makeEvent({ contractId: 'C2', ledger: 30 });
    await repo.save([a1, a2, b1]);

    const res = await service.query({ contractId: 'C1' });
    expect(res.total).toBe(2);
    expect(res.items.every((i) => i.contractId === 'C1')).toBe(true);
    // Ensure ordering is deterministic: ledger desc
    expect(res.items.map((i) => i.ledger)).toEqual([20, 10]);
  });

  it('filters by type only', async () => {
    const c1 = makeEvent({ type: SorobanEventType.CONTRACT, ledger: 5 });
    const s1 = makeEvent({ type: SorobanEventType.SYSTEM, ledger: 6 });
    const d1 = makeEvent({ type: SorobanEventType.DIAGNOSTIC, ledger: 7 });
    await repo.save([c1, s1, d1]);

    const res = await service.query({ type: SorobanEventType.SYSTEM });
    expect(res.total).toBe(1);
    expect(res.items[0].type).toBe(SorobanEventType.SYSTEM);
  });

  it('applies ledger range filters (inclusive) and boundaries', async () => {
    const e10 = makeEvent({ ledger: 10 });
    const e20 = makeEvent({ ledger: 20 });
    const e30 = makeEvent({ ledger: 30 });
    const e40 = makeEvent({ ledger: 40 });
    await repo.save([e10, e20, e30, e40]);

    const rangeRes = await service.query({ fromLedger: 20, toLedger: 30 });
    expect(rangeRes.total).toBe(2);
    // order desc: 30 then 20
    expect(rangeRes.items.map((i) => i.ledger)).toEqual([30, 20]);

    const boundary = await service.query({ fromLedger: 10, toLedger: 10 });
    expect(boundary.total).toBe(1);
    expect(boundary.items[0].ledger).toBe(10);
  });

  it('filters combined contractId + ledger range', async () => {
    const a1 = makeEvent({ contractId: 'CX', ledger: 5 });
    const a2 = makeEvent({ contractId: 'CX', ledger: 15 });
    const a3 = makeEvent({ contractId: 'CX', ledger: 25 });
    const other = makeEvent({ contractId: 'CY', ledger: 15 });
    await repo.save([a1, a2, a3, other]);

    const res = await service.query({
      contractId: 'CX',
      fromLedger: 10,
      toLedger: 20,
    });
    expect(res.total).toBe(1);
    expect(res.items[0].ledger).toBe(15);
    expect(res.items[0].contractId).toBe('CX');
  });

  it('returns empty results when no match and handles partial/invalid inputs', async () => {
    const e1 = makeEvent({ contractId: 'Z', ledger: 100 });
    await repo.save([e1]);

    const noMatch = await service.query({ contractId: 'NON_EXISTENT' });
    expect(noMatch.total).toBe(0);

    // Partial ledger inputs should be ignored (service requires both)
    const partial = await service.query({ fromLedger: 50 });
    expect(partial.total).toBe(1);

    // Negative/invalid ranges produce no matches but shouldn't throw
    const invalidRange = await service.query({ fromLedger: -10, toLedger: -1 });
    expect(invalidRange.total).toBe(0);
  });
});
