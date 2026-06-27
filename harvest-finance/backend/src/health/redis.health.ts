import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string, timeoutMs = 3000): Promise<HealthIndicatorResult> {
    const client = createClient({ url: this.configService.get<string>('REDIS_URL', 'redis://localhost:6379') });

    const timer = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Redis ping timed out')), timeoutMs),
    );

    try {
      await client.connect();
      await Promise.race([client.ping(), timer]);
      await client.disconnect();
      return this.getStatus(key, true);
    } catch (err) {
      await client.disconnect().catch(() => undefined);
      throw new HealthCheckError('Redis health check failed', this.getStatus(key, false, { message: (err as Error).message }));
    }
  }
}
