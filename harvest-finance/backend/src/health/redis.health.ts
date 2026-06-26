import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject('REDIS_CLIENT') private readonly client: Redis) {}

  async isHealthy(key = 'redis', timeout = 3000): Promise<HealthIndicatorResult> {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis timeout')), timeout),
    );
    const pingPromise = this.client.ping();
    try {
      await Promise.race([pingPromise, timeoutPromise]);
      return this.getStatus(key, true);
    } catch {
      throw new HealthCheckError('Redis is unavailable', { [key]: { status: 'down' } });
    }
  }
}