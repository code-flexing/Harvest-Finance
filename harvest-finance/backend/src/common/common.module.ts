/**
 * Common Module
 *
 * Provides shared services, interceptors, and utilities
 * including API versioning, logging, error handling, caching, and validation
 */

import { Module } from '@nestjs/common';
import { VersionService } from './services/version.service';
import { VersionInfoController } from './controllers/version-info.controller';
import { ContractCacheService } from './cache/contract-cache.service';
import { BatchProcessorService } from './batch/batch-processor.service';
import { InputSanitizerService } from './sanitization/input-sanitizer.service';
import { RateLimitGuard } from './guards/rate-limit.guard';

import { SecretsService } from './secrets/secrets.service';
import { CustomLoggerService } from '../logger/custom-logger.service';

@Module({
  providers: [
    VersionService,
    ContractCacheService,
    BatchProcessorService,
    InputSanitizerService,
    RateLimitGuard,
    SecretsService,
  ],
  controllers: [VersionInfoController],
  exports: [
    VersionService,
    ContractCacheService,
    BatchProcessorService,
    InputSanitizerService,
    RateLimitGuard,
    SecretsService,
  ],
})
export class CommonModule {}
