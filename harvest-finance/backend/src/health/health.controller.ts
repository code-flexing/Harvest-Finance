import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { RedisHealthIndicator } from './redis.health';
import { StellarHealthIndicator } from './stellar.health';
import { StellarClientService } from '../stellar/services/stellar-client.service';
import { RedisHealthIndicator } from './redis.health';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
    private stellar: StellarHealthIndicator,
    private stellarClient: StellarClientService,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health check',
    description:
      'Returns the health status of the application and its dependencies (database, Redis, Stellar Horizon, Stellar payment stream). A degraded indicator sets the top-level status to degraded without returning 5xx.',
  })
  @ApiResponse({ status: 200, description: 'All indicators healthy or degraded' })
  @ApiResponse({ status: 503, description: 'One or more indicators are unhealthy' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () => this.redis.isHealthy('redis'),
      () => this.stellar.isHealthy('stellar-horizon'),
      async (): Promise<HealthIndicatorResult> => {
        try {
          await this.stellarClient.checkHorizon(3000);
          return { 'stellar-horizon': { status: 'up' } };
        } catch {
          return { 'stellar-horizon': { status: 'down' } };
        }
        return { 'stellar-payment-stream': streamHealth };
      },
    ]);
  }
}
