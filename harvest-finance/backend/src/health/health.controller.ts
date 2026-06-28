import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { RedisHealthIndicator } from './redis.health';
import { StellarHealthIndicator } from './stellar.health';
import { StellarClientService } from '../stellar/services/stellar-client.service';

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
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health check',
    description:
      'Returns the health status of the application and its dependencies ' +
      '(database, Redis, Stellar Horizon, Stellar payment stream). ' +
      'A degraded stream indicator does not return 5xx.',
  })
  @ApiResponse({ status: 200, description: 'All indicators healthy or degraded' })
  @ApiResponse({ status: 503, description: 'One or more indicators are unhealthy' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () => this.redis.isHealthy('redis'),
      () => this.stellar.isHealthy('stellar-horizon'),
      () => {
        const { status, isConnected, lastEventTime } =
          this.stellarClient.getStreamHealth();
        return Promise.resolve({
          'stellar-payment-stream': { status, isConnected, lastEventTime },
        });
      },
    ]);
  }
}
