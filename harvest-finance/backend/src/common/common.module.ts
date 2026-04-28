import { Module } from '@nestjs/common';
import { ContractCacheService } from './cache/contract-cache.service';
import { BatchProcessorService } from './batch/batch-processor.service';
import { InputSanitizerService } from './sanitization/input-sanitizer.service';
import { RateLimitGuard } from './guards/rate-limit.guard';

/**
 * Common module exporting shared utilities and services
 * - Caching for contract interactions
 * - Batch processing for RPC operations
 * - Input validation and sanitization
 * - Rate limiting guards
 */
@Module({
  providers: [
    ContractCacheService,
    BatchProcessorService,
    InputSanitizerService,
    RateLimitGuard,
  ],
  exports: [
    ContractCacheService,
    BatchProcessorService,
    InputSanitizerService,
    RateLimitGuard,
  ],
})
export class CommonModule {}
