import { Test, TestingModule } from '@nestjs/testing';
import { SorobanIndexerService } from '../soroban-indexer.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SorobanEvent } from '../../database/entities/soroban-event.entity';
import { IndexerState } from '../../database/entities/indexer-state.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DataSource } from 'typeorm';
import axios from 'axios';

jest.mock('axios');

/** Builds a fake queryRunner that records calls for assertion. */
function makeQueryRunner(opts: {
  insertResult?: { identifiers: any[] };
  saveError?: Error;
  insertError?: Error;
}) {
  const qr: any = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      save: jest.fn().mockImplementation(() => {
        if (opts.saveError) return Promise.reject(opts.saveError);
        return Promise.resolve(undefined);
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockImplementation(() => {
          if (opts.insertError) return Promise.reject(opts.insertError);
          return Promise.resolve(
            opts.insertResult ?? { identifiers: [{ id: 'uuid-1' }] },
          );
        }),
      }),
    },
  };
  return qr;
}

describe('SorobanIndexerService - Cursor Persistence', () => {
  let service: SorobanIndexerService;
  let mockEventRepository: any;
  let mockIndexerStateRepository: any;
  let mockCacheManager: any;
  let mockAxios: any;
  let mockQueryRunner: any;

  function buildQueryBuilderChain(overrides: Partial<any> = {}) {
    const chain: any = {
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ maxLedger: null }),
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ identifiers: [] }),
      ...overrides,
    };
    // Each call to a builder method returns the same chain object so chaining works.
    Object.keys(chain).forEach((key) => {
      if (typeof chain[key] === 'function') {
        const original = chain[key];
        chain[key] = jest.fn((...args: any[]) => {
          const r = original.apply(chain, args);
          return r === chain ? chain : r;
        });
      }
    });
    return chain;
  }

  async function buildModule(
    stateOnDisk: IndexerState | null = null,
  ): Promise<void> {
    const qbChain = buildQueryBuilderChain();

    mockEventRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(qbChain),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      count: jest.fn().mockResolvedValue(0),
      manager: {
        connection: {
          createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
        },
      },
    };

    mockIndexerStateRepository = {
      findOne: jest.fn().mockResolvedValue(stateOnDisk),
      find: jest.fn().mockResolvedValue(stateOnDisk ? [stateOnDisk] : []),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SorobanIndexerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue: any) => {
              const cfg: Record<string, any> = {
                SOROBAN_INDEXER_ENABLED: 'true',
                STELLAR_NETWORK: 'testnet',
                SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
                SOROBAN_INDEXER_PAGE_SIZE: '100',
                SOROBAN_INDEXER_CONTRACT_IDS: '',
                SOROBAN_INDEXER_BOOTSTRAP_LEDGERS: '120',
              };
              return cfg[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: getRepositoryToken(SorobanEvent),
          useValue: mockEventRepository,
        },
        {
          provide: getRepositoryToken(IndexerState),
          useValue: mockIndexerStateRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockQueryRunner.manager)),
          },
        },
      ],
    }).compile();

    service = module.get<SorobanIndexerService>(SorobanIndexerService);
    await service.onModuleInit();
  }

  beforeEach(() => {
    mockCacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    mockAxios = {
      post: jest.fn(),
    };

    (axios.create as jest.Mock).mockReturnValue(mockAxios);

    mockQueryRunner = makeQueryRunner({});
  });

  // ─── onModuleInit cursor restoration ──────────────────────────────────────

  describe('onModuleInit cursor restoration', () => {
    it('sets lastCursor to null when no indexer_state row exists', async () => {
      await buildModule(null);

      expect(service['lastCursor']).toBeNull();
      expect(mockIndexerStateRepository.findOne).toHaveBeenCalledWith({
        where: { contractId: '*' },
      });
    });

    it('restores lastCursor from the indexer_state table', async () => {
      const storedState = {
        contractId: '*',
        lastCursor: 'token-999',
        updatedAt: new Date(),
      } as IndexerState;

      await buildModule(storedState);

      expect(service['lastCursor']).toBe('token-999');
    });

    it('does not throw when indexer_state table does not yet exist', async () => {
      mockIndexerStateRepository = {
        findOne: jest.fn().mockRejectedValue(new Error('relation "indexer_state" does not exist')),
      };

      // Rebuild the module with the error-throwing repository.
      const qbChain = buildQueryBuilderChain();
      mockEventRepository = {
        createQueryBuilder: jest.fn().mockReturnValue(qbChain),
        findAndCount: jest.fn().mockResolvedValue([[], 0]),
        count: jest.fn().mockResolvedValue(0),
        manager: {
          connection: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SorobanIndexerService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key: string, def: any) => {
                const cfg: Record<string, any> = {
                  SOROBAN_INDEXER_ENABLED: 'true',
                  STELLAR_NETWORK: 'testnet',
                  SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
                  SOROBAN_INDEXER_PAGE_SIZE: '100',
                  SOROBAN_INDEXER_CONTRACT_IDS: '',
                  SOROBAN_INDEXER_BOOTSTRAP_LEDGERS: '120',
                };
                return cfg[key] ?? def;
              }),
            },
          },
          {
            provide: getRepositoryToken(SorobanEvent),
            useValue: mockEventRepository,
          },
          {
            provide: getRepositoryToken(IndexerState),
            useValue: mockIndexerStateRepository,
          },
          { provide: CACHE_MANAGER, useValue: mockCacheManager },
          { provide: DataSource, useValue: { transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockQueryRunner.manager)) } },
        ],
      }).compile();

      const svc = module.get<SorobanIndexerService>(SorobanIndexerService);
      // Should not throw even though findOne rejects.
      await expect(svc.onModuleInit()).resolves.toBeUndefined();
      expect(svc['lastCursor']).toBeNull();
    });
  });

  // ─── runOnce cursor persistence ───────────────────────────────────────────

  describe('runOnce cursor persistence', () => {
    const makeRpcResponse = (tokens: string[]) => ({
      data: {
        result: {
          events: tokens.map((t, i) => ({
            id: `evt-${i}`,
            type: 'contract',
            ledger: 100 + i,
            ledgerClosedAt: new Date().toISOString(),
            pagingToken: t,
          })),
          latestLedger: 200,
        },
      },
    });

    it('saves the max pagingToken to indexer_state after a successful batch', async () => {
      await buildModule(null);

      mockAxios.post.mockResolvedValueOnce(
        // Bootstrap getLatestLedger call
        { data: { result: { sequence: 150 } } },
      );
      mockAxios.post.mockResolvedValueOnce(
        makeRpcResponse(['token-100', 'token-102', 'token-101']),
      );

      await service.runOnce();

      // queryRunner.manager.save should have been called with IndexerState data.
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        IndexerState,
        expect.objectContaining({ lastCursor: 'token-102' }),
      );
      // Transaction should have been committed.
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('updates in-memory lastCursor to the max pagingToken after commit', async () => {
      await buildModule(null);

      mockAxios.post
        .mockResolvedValueOnce({ data: { result: { sequence: 150 } } })
        .mockResolvedValueOnce(makeRpcResponse(['aaa', 'zzz', 'mmm']));

      await service.runOnce();

      expect(service['lastCursor']).toBe('zzz');
    });

    it('rolls back the transaction and rethrows on insert error', async () => {
      mockQueryRunner = makeQueryRunner({
        insertError: new Error('DB write failed'),
      });

      await buildModule(null);

      mockAxios.post
        .mockResolvedValueOnce({ data: { result: { sequence: 150 } } })
        .mockResolvedValueOnce(makeRpcResponse(['token-1']));

      await expect(service.runOnce()).rejects.toThrow('DB write failed');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      // In-memory cursor should NOT have been updated.
      expect(service['lastCursor']).toBeNull();
    });

    it('rolls back the transaction and rethrows on cursor save error', async () => {
      mockQueryRunner = makeQueryRunner({
        saveError: new Error('Cursor save failed'),
      });

      await buildModule(null);

      mockAxios.post
        .mockResolvedValueOnce({ data: { result: { sequence: 150 } } })
        .mockResolvedValueOnce(makeRpcResponse(['token-1']));

      await expect(service.runOnce()).rejects.toThrow('Cursor save failed');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(service['lastCursor']).toBeNull();
    });

    it('returns early without touching indexer_state when no events are returned', async () => {
      await buildModule(null);

      mockAxios.post
        .mockResolvedValueOnce({ data: { result: { sequence: 150 } } })
        .mockResolvedValueOnce({
          data: { result: { events: [], latestLedger: 200 } },
        });

      const result = await service.runOnce();

      expect(result.saved).toBe(0);
      // No transaction should have been started.
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });
  });

  // ─── cursor-based pagination in fetchEvents ────────────────────────────────

  describe('fetchEvents cursor-based pagination', () => {
    it('passes cursor in pagination when lastCursor is set', async () => {
      const storedState = {
        contractId: '*',
        lastCursor: 'stored-cursor-abc',
        updatedAt: new Date(),
      } as IndexerState;

      await buildModule(storedState);

      const response = {
        data: { result: { events: [], latestLedger: 200 } },
      };
      mockAxios.post.mockResolvedValue(response);

      await service.runOnce();

      const postedBody = mockAxios.post.mock.calls[0][1];
      expect(postedBody.params.pagination).toEqual(
        expect.objectContaining({ cursor: 'stored-cursor-abc' }),
      );
      expect(postedBody.params).not.toHaveProperty('startLedger');
    });

    it('passes startLedger (no cursor) when no persisted state exists', async () => {
      await buildModule(null);

      mockAxios.post
        .mockResolvedValueOnce({ data: { result: { sequence: 150 } } }) // bootstrap
        .mockResolvedValueOnce({
          data: { result: { events: [], latestLedger: 200 } },
        });

      await service.runOnce();

      // Second call is the getEvents call.
      const postedBody = mockAxios.post.mock.calls[1][1];
      expect(postedBody.params).toHaveProperty('startLedger');
      expect(postedBody.params.pagination).not.toHaveProperty('cursor');
    });
  });

  // ─── stateKey logic ───────────────────────────────────────────────────────

  describe('stateKey', () => {
    it('uses "*" as key when no contract IDs are configured', async () => {
      await buildModule(null);

      expect(service['stateKey']).toBe('*');
    });
  });
});
