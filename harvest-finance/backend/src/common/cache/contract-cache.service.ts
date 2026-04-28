import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Logger } from '@nestjs/common';

/**
 * Caching layer for smart contract interactions
 * Reduces RPC calls and improves response times for frequently accessed data
 */
@Injectable()
export class ContractCacheService {
  private readonly logger = new Logger(ContractCacheService.name);
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private readonly VAULT_STATE_TTL = 60; // 1 minute for frequently changing data
  private readonly ACCOUNT_INFO_TTL = 600; // 10 minutes for account data

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get cached vault state or fetch fresh data
   */
  async getVaultState<T>(
    vaultId: string,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = `vault:state:${vaultId}`;
    const cached = await this.cacheManager.get<T>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for vault state: ${vaultId}`);
      return cached;
    }

    this.logger.debug(`Cache miss for vault state: ${vaultId}, fetching fresh data`);
    const data = await fetcher();
    await this.cacheManager.set(cacheKey, data, this.VAULT_STATE_TTL);
    return data;
  }

  /**
   * Get cached account information
   */
  async getAccountInfo<T>(
    publicKey: string,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = `account:info:${publicKey}`;
    const cached = await this.cacheManager.get<T>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for account info: ${publicKey}`);
      return cached;
    }

    this.logger.debug(`Cache miss for account info: ${publicKey}, fetching fresh data`);
    const data = await fetcher();
    await this.cacheManager.set(cacheKey, data, this.ACCOUNT_INFO_TTL);
    return data;
  }

  /**
   * Get cached contract data with custom TTL
   */
  async getContractData<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<T> {
    const cacheKey = `contract:${key}`;
    const cached = await this.cacheManager.get<T>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for contract data: ${key}`);
      return cached;
    }

    this.logger.debug(`Cache miss for contract data: ${key}, fetching fresh data`);
    const data = await fetcher();
    await this.cacheManager.set(cacheKey, data, ttl);
    return data;
  }

  /**
   * Invalidate specific cache entries
   */
  async invalidate(pattern: string): Promise<void> {
    const cacheKey = `${pattern}`;
    await this.cacheManager.del(cacheKey);
    this.logger.debug(`Cache invalidated: ${cacheKey}`);
  }

  /**
   * Batch invalidate multiple cache entries
   */
  async invalidateBatch(patterns: string[]): Promise<void> {
    await Promise.all(patterns.map((p) => this.invalidate(p)));
    this.logger.debug(`Batch cache invalidation: ${patterns.length} entries`);
  }

  /**
   * Clear all cache (use sparingly)
   */
  async clear(): Promise<void> {
    await this.cacheManager.reset();
    this.logger.warn('All cache cleared');
  }
}
