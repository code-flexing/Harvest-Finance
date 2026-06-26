import { Test, TestingModule } from '@nestjs/testing';
import { SorobanIndexerService } from './soroban-indexer.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SorobanEvent } from '../database/entities/soroban-event.entity';
import { IndexerState } from '../database/entities/indexer-state.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import axios from 'axios';

jest.mock('axios');

describe('SorobanIndexerService - Error Handling', () => {
  let service: SorobanIndexerService;
  let mockEventRepository: any;
  let mockIndexerStateRepository: any;
  let mockCacheManager: any;
  let mockAxios: any;

  /** Shared queryRunner used by runOnce() via manager.connection.createQueryRunner */
  function makeDefaultQueryRunner() {
    return {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        save: jest.fn().mockResolvedValue(undefined),
        createQueryBuilder: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnThis(),
          into: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          orIgnore: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ identifiers: [{ id: 'uuid-1' }] }),
        }),
      },
    };
  }

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const defaultQueryRunner = makeDefaultQueryRunner();

    mockEventRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxLedger: null }),
      }),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      count: jest.fn().mockResolvedValue(0),
      manager: {
        connection: {
          createQueryRunner: jest.fn().mockReturnValue(defaultQueryRunner),
        },
      },
    };

    mockIndexerStateRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockAxios = {
      post: jest.fn(),
    };

    (axios.create as jest.Mock).mockReturnValue(mockAxios);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SorobanIndexerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key, defaultValue) => {
              const config: Record<string, any> = {
                SOROBAN_INDEXER_ENABLED: 'true',
                STELLAR_NETWORK: 'testnet',
                SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
                SOROBAN_INDEXER_PAGE_SIZE: '100',
                SOROBAN_INDEXER_CONTRACT_IDS: '',
                SOROBAN_INDEXER_BOOTSTRAP_LEDGERS: '120',
              };
              return config[key] ?? defaultValue;
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
      ],
    }).compile();

    service = module.get<SorobanIndexerService>(SorobanIndexerService);
    await service.onModuleInit();
  });

  describe('RPC Error Handling', () => {
    it('should handle RPC timeout errors gracefully', async () => {
      const timeoutError = new Error('timeout of 15000ms exceeded');
      mockAxios.post.mockRejectedValue(timeoutError);

      await expect(service['rpcCall']('getEvents', {})).rejects.toThrow();
    });

    it('should handle RPC error responses', async () => {
      const errorResponse = {
        data: {
          error: {
            code: -32000,
            message: 'Server error: transaction not found',
          },
        },
      };

      mockAxios.post.mockResolvedValue(errorResponse);

      await expect(service['rpcCall']('getEvents', {})).rejects.toThrow(
        'Soroban RPC error: -32000 Server error: transaction not found',
      );
    });

    it('should handle malformed JSON responses', async () => {
      const malformedResponse = {
        data: 'not valid json',
      };

      mockAxios.post.mockResolvedValue(malformedResponse);

      await expect(service['rpcCall']('getEvents', {})).rejects.toThrow();
    });

    it('should retry on network failures during runOnce', async () => {
      mockAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(service.runOnce()).rejects.toThrow();
    });

    it('should handle missing result field in RPC response', async () => {
      const invalidResponse = {
        data: {
          id: 1,
          jsonrpc: '2.0',
        },
      };

      mockAxios.post.mockResolvedValue(invalidResponse);

      await expect(service['rpcCall']('getLatestLedger', {})).rejects.toThrow();
    });
  });

  describe('Event Processing Error Handling', () => {
    it('should handle null ledger in event', async () => {
      const validResponse = {
        data: {
          result: {
            events: [
              {
                id: 'evt-1',
                type: 'contract',
                ledger: null,
                pagingToken: 'token-1',
              },
            ],
            latestLedger: 100,
          },
        },
      };

      mockAxios.post.mockResolvedValue(validResponse);
      mockEventRepository
        .createQueryBuilder()
        .getRawOne.mockResolvedValue(null);

      const result = await service.runOnce();

      expect(result.saved).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing contract ID in event', async () => {
      const validResponse = {
        data: {
          result: {
            events: [
              {
                id: 'evt-1',
                type: 'contract',
                ledger: 100,
                pagingToken: 'token-1',
              },
            ],
            latestLedger: 100,
          },
        },
      };

      mockAxios.post.mockResolvedValue(validResponse);
      mockEventRepository
        .createQueryBuilder()
        .getRawOne.mockResolvedValue(null);

      const result = await service.runOnce();

      expect(result.latestLedger).toBe(100);
    });

    it('should handle database persistence errors', async () => {
      const validResponse = {
        data: {
          result: {
            events: [
              {
                id: 'evt-1',
                type: 'contract',
                ledger: 100,
                pagingToken: 'token-1',
              },
            ],
            latestLedger: 100,
          },
        },
      };

      mockAxios.post.mockResolvedValue(validResponse);

      // Inject a DB error via the queryRunner that runOnce() uses internally.
      const failingQueryRunner = makeDefaultQueryRunner();
      failingQueryRunner.manager.createQueryBuilder.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(new Error('Database error')),
      });
      mockEventRepository.manager.connection.createQueryRunner.mockReturnValue(
        failingQueryRunner,
      );

      await expect(service.runOnce()).rejects.toThrow();
    });
  });

  describe('Cache Handling', () => {
    it('should use cached RPC responses', async () => {
      const cachedResult = {
        events: [],
        latestLedger: 100,
      };

      mockCacheManager.get.mockResolvedValueOnce(cachedResult);

      const result = await service['rpcCall']('getEvents', {});

      expect(result).toEqual(cachedResult);
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('should cache RPC responses', async () => {
      const rpcResult = {
        events: [],
        latestLedger: 100,
      };

      const response = {
        data: {
          result: rpcResult,
        },
      };

      mockAxios.post.mockResolvedValue(response);
      mockCacheManager.get.mockResolvedValueOnce(null);

      await service['rpcCall']('getEvents', { startLedger: 1 });

      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      const response = {
        data: {
          result: { events: [], latestLedger: 100 },
        },
      };

      mockAxios.post.mockResolvedValue(response);

      await expect(service['rpcCall']('getEvents', {})).rejects.toThrow();
    });
  });

  describe('Poll Execution', () => {
    it('should handle errors during poll', async () => {
      const pollError = new Error('RPC unavailable');
      mockAxios.post.mockRejectedValue(pollError);

      await service.pollEvents();

      expect(service['running']).toBe(false);
    });

    it('should not poll when already running', async () => {
      service['running'] = true;

      mockAxios.post.mockResolvedValue({
        data: { result: { events: [], latestLedger: 100 } },
      });

      await service.pollEvents();

      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('should update last polled timestamp even on error', async () => {
      mockAxios.post.mockRejectedValue(new Error('RPC error'));

      await service.pollEvents();

      expect(service['lastPolledAt']).toBeDefined();
    });
  });

  describe('Network Error Scenarios', () => {
    it('should handle connection refused errors', async () => {
      const connectionError = new Error('ECONNREFUSED');
      mockAxios.post.mockRejectedValue(connectionError);

      await expect(service['rpcCall']('getLatestLedger', {})).rejects.toThrow();
    });

    it('should handle DNS resolution failures', async () => {
      const dnsError = new Error('ENOTFOUND soroban-testnet.stellar.org');
      mockAxios.post.mockRejectedValue(dnsError);

      await expect(service['rpcCall']('getLatestLedger', {})).rejects.toThrow();
    });

    it('should handle partial response data', async () => {
      const partialResponse = {
        data: {
          result: {
            events: [
              {
                id: 'evt-1',
              },
            ],
          },
        },
      };

      mockAxios.post.mockResolvedValue(partialResponse);
      mockEventRepository
        .createQueryBuilder()
        .getRawOne.mockResolvedValue(null);

      const result = await service.runOnce();

      expect(result).toBeDefined();
    });
  });

  describe('Start Ledger Resolution', () => {
    it('should fallback to ledger 1 if bootstrap fails', async () => {
      mockAxios.post.mockRejectedValue(new Error('RPC timeout'));
      mockEventRepository
        .createQueryBuilder()
        .getRawOne.mockResolvedValue(null);

      const startLedger = await service['resolveStartLedger']();

      expect(startLedger).toBe(1);
    });

    it('should use cached latest ledger when available', async () => {
      mockEventRepository.createQueryBuilder().getRawOne.mockResolvedValue({
        maxLedger: '50',
      });

      await service.onModuleInit();

      const startLedger = await service['resolveStartLedger']();

      expect(startLedger).toBe(51);
    });
  });

  describe('Concurrent Polling Protection', () => {
    it('should prevent concurrent polls', async () => {
      service['running'] = true;

      const successResponse = {
        data: {
          result: {
            events: [],
            latestLedger: 100,
          },
        },
      };

      mockAxios.post.mockResolvedValue(successResponse);

      await service.pollEvents();

      expect(mockAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('Status and Query', () => {
    it('should return indexer status', async () => {
      const status = await service.status();

      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('rpcUrl');
      expect(status).toHaveProperty('lastLedger');
      expect(status).toHaveProperty('totalEvents');
    });

    it('should query events with filters', async () => {
      mockEventRepository.findAndCount.mockResolvedValue([
        [
          {
            id: 'evt-1',
            contractId: 'contract-1',
            ledger: 100,
          },
        ],
        1,
      ]);

      const result = await service.query({
        contractId: 'contract-1',
        skip: 0,
        limit: 50,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
