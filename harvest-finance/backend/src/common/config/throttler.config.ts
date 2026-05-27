import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const buildThrottlerOptions = (
  config: ConfigService,
): ThrottlerModuleOptions => [
  {
    name: 'short',
    ttl: config.get<number>('THROTTLE_SHORT_TTL', 1000),
    limit: config.get<number>('THROTTLE_SHORT_LIMIT', 5),
  },
  {
    name: 'medium',
    ttl: config.get<number>('THROTTLE_MEDIUM_TTL', 10_000),
    limit: config.get<number>('THROTTLE_MEDIUM_LIMIT', 30),
  },
  {
    name: 'long',
    ttl: config.get<number>('THROTTLE_TTL', 60_000),
    limit: config.get<number>('THROTTLE_LIMIT', 100),
  },
];
