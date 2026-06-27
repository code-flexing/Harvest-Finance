import {
  CircuitBreaker,
  CircuitBreakerOpenError,
} from './circuit-breaker';

describe('CircuitBreaker', () => {
  let now: number;

  const createBreaker = (failureThreshold = 2) =>
    new CircuitBreaker({
      name: 'test-circuit',
      failureThreshold,
      resetTimeoutMs: 1000,
      shouldTrip: (err) => Boolean((err as { transient?: boolean }).transient),
      now: () => now,
    });

  beforeEach(() => {
    now = 0;
  });

  it('opens after the configured number of transient failures', async () => {
    const breaker = createBreaker();
    const transientError = { transient: true };

    await expect(
      breaker.execute(() => Promise.reject(transientError)),
    ).rejects.toBe(transientError);
    await expect(
      breaker.execute(() => Promise.reject(transientError)),
    ).rejects.toBe(transientError);

    expect(breaker.snapshot().state).toBe('open');
    await expect(breaker.execute(() => Promise.resolve('ok'))).rejects.toThrow(
      CircuitBreakerOpenError,
    );
  });

  it('moves to half-open after reset timeout and closes after a successful probe', async () => {
    const breaker = createBreaker(1);

    await expect(
      breaker.execute(() => Promise.reject({ transient: true })),
    ).rejects.toEqual({ transient: true });
    expect(breaker.snapshot().state).toBe('open');

    now = 1000;

    await expect(breaker.execute(() => Promise.resolve('ok'))).resolves.toBe(
      'ok',
    );
    expect(breaker.snapshot()).toMatchObject({
      state: 'closed',
      failureCount: 0,
      retryAfterMs: 0,
    });
  });

  it('does not trip on non-transient failures', async () => {
    const breaker = createBreaker(1);
    const validationError = { transient: false };

    await expect(
      breaker.execute(() => Promise.reject(validationError)),
    ).rejects.toBe(validationError);

    expect(breaker.snapshot().state).toBe('closed');
    expect(breaker.snapshot().failureCount).toBe(0);
  });

  it('reopens when the half-open probe fails with a transient error', async () => {
    const breaker = createBreaker(1);

    await expect(
      breaker.execute(() => Promise.reject({ transient: true })),
    ).rejects.toEqual({ transient: true });

    now = 1000;
    await expect(
      breaker.execute(() => Promise.reject({ transient: true })),
    ).rejects.toEqual({ transient: true });

    expect(breaker.snapshot().state).toBe('open');
    expect(breaker.snapshot().retryAfterMs).toBe(1000);
  });
});
