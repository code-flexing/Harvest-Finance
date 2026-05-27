import { ConfigService } from '@nestjs/config';
import { buildThrottlerOptions } from './throttler.config';

const makeConfig = (env: Record<string, string | number | undefined>) =>
  ({
    get: <T>(key: string, defaultValue?: T): T => {
      const value = env[key];
      return (value === undefined ? defaultValue : value) as T;
    },
  }) as unknown as ConfigService;

describe('buildThrottlerOptions', () => {
  it('exposes short, medium, and long named tiers', () => {
    const options = buildThrottlerOptions(makeConfig({}));
    expect(Array.isArray(options)).toBe(true);
    const names = (options as Array<{ name?: string }>).map(
      (tier) => tier.name,
    );
    expect(names).toEqual(['short', 'medium', 'long']);
  });

  it('falls back to safe defaults when env vars are unset', () => {
    const options = buildThrottlerOptions(makeConfig({})) as Array<{
      name: string;
      ttl: number;
      limit: number;
    }>;

    expect(options[0]).toMatchObject({ name: 'short', ttl: 1000, limit: 5 });
    expect(options[1]).toMatchObject({
      name: 'medium',
      ttl: 10_000,
      limit: 30,
    });
    expect(options[2]).toMatchObject({ name: 'long', ttl: 60_000, limit: 100 });
  });

  it('honors env-supplied overrides for every tier', () => {
    const options = buildThrottlerOptions(
      makeConfig({
        THROTTLE_SHORT_TTL: 500,
        THROTTLE_SHORT_LIMIT: 2,
        THROTTLE_MEDIUM_TTL: 5_000,
        THROTTLE_MEDIUM_LIMIT: 15,
        THROTTLE_TTL: 120_000,
        THROTTLE_LIMIT: 200,
      }),
    ) as Array<{ name: string; ttl: number; limit: number }>;

    expect(options[0]).toMatchObject({ name: 'short', ttl: 500, limit: 2 });
    expect(options[1]).toMatchObject({ name: 'medium', ttl: 5_000, limit: 15 });
    expect(options[2]).toMatchObject({
      name: 'long',
      ttl: 120_000,
      limit: 200,
    });
  });
});
