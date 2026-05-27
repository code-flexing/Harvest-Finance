import { retry } from './retry';

const noSleep = () => Promise.resolve();

describe('retry', () => {
  it('returns the value on the first successful attempt', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await retry(fn, {
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
      isRetryable: () => true,
      sleep: noSleep,
      jitter: false,
    });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries until the call succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom-1'))
      .mockRejectedValueOnce(new Error('boom-2'))
      .mockResolvedValue('eventually');

    const result = await retry(fn, {
      maxAttempts: 5,
      baseDelayMs: 10,
      maxDelayMs: 100,
      isRetryable: () => true,
      sleep: noSleep,
      jitter: false,
    });

    expect(result).toBe('eventually');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting maxAttempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always'));

    await expect(
      retry(fn, {
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
        isRetryable: () => true,
        sleep: noSleep,
        jitter: false,
      }),
    ).rejects.toThrow('always');

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('short-circuits when isRetryable returns false', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('non-retryable'));

    await expect(
      retry(fn, {
        maxAttempts: 5,
        baseDelayMs: 10,
        maxDelayMs: 100,
        isRetryable: () => false,
        sleep: noSleep,
        jitter: false,
      }),
    ).rejects.toThrow('non-retryable');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('applies exponential backoff capped by maxDelayMs (no jitter)', async () => {
    const sleeps: number[] = [];
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('a'))
      .mockRejectedValueOnce(new Error('b'))
      .mockRejectedValueOnce(new Error('c'))
      .mockResolvedValue('done');

    const result = await retry(fn, {
      maxAttempts: 4,
      baseDelayMs: 100,
      maxDelayMs: 250,
      factor: 2,
      jitter: false,
      isRetryable: () => true,
      sleep: (ms) => {
        sleeps.push(ms);
        return Promise.resolve();
      },
    });

    expect(result).toBe('done');
    // attempt 1 fails -> sleep 100, attempt 2 fails -> sleep 200,
    // attempt 3 fails -> sleep capped at 250.
    expect(sleeps).toEqual([100, 200, 250]);
  });

  it('invokes onRetry once per backoff', async () => {
    const onRetry = jest.fn();
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValue('ok');

    await retry(fn, {
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
      isRetryable: () => true,
      sleep: noSleep,
      jitter: false,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, 10);
  });
});
