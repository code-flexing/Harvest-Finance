import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { StellarClientService } from '../stellar/services/stellar-client.service';
import { RedisHealthIndicator } from './redis.health';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private stellarClient: StellarClientService,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 1500 }),
      () => this.redis.isHealthy('redis', 3000),
      async (): Promise<HealthIndicatorResult> => {
        try {
          await this.stellarClient.checkHorizon(3000);
          return { 'stellar-horizon': { status: 'up' } };
        } catch {
          return { 'stellar-horizon': { status: 'down' } };
        }
      },
    ]);
  }
}
