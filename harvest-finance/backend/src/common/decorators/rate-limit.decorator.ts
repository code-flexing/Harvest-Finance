import { SetMetadata } from '@nestjs/common';

/**
 * Configuration options for the `@RateLimit` decorator.
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed within the TTL window. */
  limit: number;
  /** Time-to-live window in seconds. */
  ttl: number;
  /** Optional custom error message returned when the limit is exceeded. */
  message?: string;
}

export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * Applies per-endpoint, per-user/IP rate limiting to a controller method.
 *
 * Works together with `RateLimitGuard`, which must be registered either
 * globally or on the controller/method via `@UseGuards(RateLimitGuard)`.
 *
 * **When to use:**
 * Reach for `@RateLimit` on sensitive endpoints where the built-in
 * `@Throttle` limits are insufficient or you need a custom error message —
 * for example: password-reset, OTP verification, or login endpoints.
 *
 * **How it works:**
 * `RateLimitGuard` reads the metadata set here, builds a cache key from
 * `<method>:<path>:<userId|ip>`, and increments a counter stored in Redis
 * (via `CacheManager`). When the counter exceeds `limit` within the `ttl`
 * window a `429 Too Many Requests` response is returned.
 *
 * @param config - Rate limit configuration.
 * @param config.limit - Max requests allowed in the TTL window.
 * @param config.ttl   - Window duration in **seconds**.
 * @param config.message - Optional override for the 429 error message.
 *
 * @example
 * // Allow 3 password-reset attempts per hour per user/IP
 * @RateLimit({ limit: 3, ttl: 3600 })
 * @Post('forgot-password')
 * async forgotPassword(@Body() dto: ForgotPasswordDto) { ... }
 *
 * @example
 * // Allow 5 login attempts per minute with a custom message
 * @RateLimit({ limit: 5, ttl: 60, message: 'Too many login attempts. Try again in 1 minute.' })
 * @Post('login')
 * async login(@Body() dto: LoginDto) { ... }
 *
 * @example
 * // Combine with UseGuards when not registered globally
 * @UseGuards(RateLimitGuard)
 * @RateLimit({ limit: 10, ttl: 60 })
 * @Post('register')
 * async register(@Body() dto: RegisterDto) { ... }
 */
export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config);
