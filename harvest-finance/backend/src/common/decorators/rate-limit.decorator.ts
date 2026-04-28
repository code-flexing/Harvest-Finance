import { SetMetadata } from '@nestjs/common';

export interface RateLimitConfig {
  limit: number;
  ttl: number; // in seconds
  message?: string;
}

export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * Decorator to apply custom rate limiting to specific endpoints
 * Works in conjunction with ThrottlerGuard
 *
 * @example
 * @RateLimit({ limit: 3, ttl: 3600 })
 * @Post('password-reset')
 * async resetPassword() { ... }
 */
export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config);
