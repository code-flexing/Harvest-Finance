import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ContractCacheService } from './contract-cache.service';

describe('ContractCacheService', () => {
  let service: ContractCacheService;
  let cacheManager: any;

  beforeEach(async () => {
    // Create a simple in-memory cache to simulate TTL
    const store = new Map<string, { value: any; expiresAt: number }>();

    cacheManager = {
      get: jest.fn(async (key: string) => {
        const item = store.get(key);
        if (!item) return undefined;
        if (Date.now() >= item.expiresAt) {
          store.delete(key);
          return undefined;
        }
        return item.value;
      }),
      set: jest.fn(async (key: string, value: any, ttl: number) => {
        // ttl is treated as seconds here to match the service's intention
        store.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
      }),
      del: jest.fn(async (key: string) => {
        store.delete(key);
      }),
      clear: jest.fn(async () => {
        store.clear();
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    service = module.get<ContractCacheService>(ContractCacheService);

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Cache Hit', () => {
    it('should return cached value and not call fetcher', async () => {
      const fetcher = jest.fn().mockResolvedValue('fresh-data');
      
      // Initial call - cache miss
      await service.getVaultState('vault-1', fetcher);
      
      // Second call - cache hit
      const result = await service.getVaultState('vault-1', fetcher);
      
      expect(result).toBe('fresh-data');
      expect(fetcher).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe('Cache Miss', () => {
    it('should fetch fresh data and store in cache for vault state', async () => {
      const fetcher = jest.fn().mockResolvedValue('vault-data');
      const result = await service.getVaultState('vault-2', fetcher);
      
      expect(result).toBe('vault-data');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).toHaveBeenCalledWith('vault:state:vault-2', 'vault-data', 60);
    });

    it('should fetch fresh data and store in cache for account info', async () => {
      const fetcher = jest.fn().mockResolvedValue('account-data');
      const result = await service.getAccountInfo('pub-key', fetcher);
      
      expect(result).toBe('account-data');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).toHaveBeenCalledWith('account:info:pub-key', 'account-data', 600);
    });

    it('should fetch fresh data and store in cache for contract data with default TTL', async () => {
      const fetcher = jest.fn().mockResolvedValue('contract-data');
      const result = await service.getContractData('key-1', fetcher);
      
      expect(result).toBe('contract-data');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).toHaveBeenCalledWith('contract:key-1', 'contract-data', 300);
    });
  });

  describe('TTL Expiry', () => {
    it('should expire cache after TTL and fetch fresh data', async () => {
      const fetcher1 = jest.fn().mockResolvedValue('data-1');
      await service.getVaultState('vault-3', fetcher1);
      
      // Fast-forward time past VAULT_STATE_TTL (60 seconds)
      jest.advanceTimersByTime(61 * 1000);
      
      const fetcher2 = jest.fn().mockResolvedValue('data-2');
      const result = await service.getVaultState('vault-3', fetcher2);
      
      expect(result).toBe('data-2');
      expect(fetcher2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Invalidation', () => {
    it('should remove entry and force fresh fetch on next call', async () => {
      const fetcher1 = jest.fn().mockResolvedValue('data-1');
      await service.getVaultState('vault-4', fetcher1);
      
      await service.invalidate('vault:state:vault-4');
      
      const fetcher2 = jest.fn().mockResolvedValue('fresh-data');
      const result = await service.getVaultState('vault-4', fetcher2);
      
      expect(result).toBe('fresh-data');
      expect(fetcher2).toHaveBeenCalledTimes(1);
      expect(cacheManager.del).toHaveBeenCalledWith('vault:state:vault-4');
    });

    it('should invalidate batch of entries', async () => {
      await service.invalidateBatch(['key1', 'key2']);
      expect(cacheManager.del).toHaveBeenCalledWith('key1');
      expect(cacheManager.del).toHaveBeenCalledWith('key2');
    });

    it('should clear all cache', async () => {
      await service.clear();
      expect(cacheManager.clear).toHaveBeenCalled();
    });
  });
});
