import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  TooManyRequestsException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RATE_LIMIT_KEY, RateLimitConfig } from '../decorators/rate-limit.decorator';

/**
 * Guard for custom rate limiting on sensitive endpoints
 * Tracks requests per user/IP and enforces limits
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<RateLimitConfig>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const ip = request.ip;
    const identifier = userId || ip;
    const endpoint = `${request.method}:${request.path}`;
    const cacheKey = `rate_limit:${endpoint}:${identifier}`;

    const current = await this.cacheManager.get<number>(cacheKey);
    const count = (current || 0) + 1;

    if (count > config.limit) {
      throw new TooManyRequestsException(
        config.message ||
          `Too many requests. Limit: ${config.limit} per ${config.ttl}s`,
      );
    }

    if (count === 1) {
      await this.cacheManager.set(cacheKey, count, config.ttl * 1000);
    } else {
      await this.cacheManager.set(cacheKey, count);
    }

    return true;
  }
}
