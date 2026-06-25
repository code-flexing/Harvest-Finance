import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheckError,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { StellarClientService } from '../stellar/services/stellar-client.service';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private stellarClient: StellarClientService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 1500 }),
      async (): Promise<HealthIndicatorResult> => {
        const streamHealth = this.stellarClient.getStreamHealth();
        if (!streamHealth.isConnected) {
          throw new HealthCheckError('Stellar stream is disconnected', {
            'stellar-payment-stream': streamHealth,
          });
        }
        return {
          'stellar-payment-stream': streamHealth,
        };
      },
    ]);
  }
}
