export interface RetryOptions {
  /** Total attempts including the first call. Must be >= 1. */
  maxAttempts: number;
  /** Initial backoff delay before the second attempt, in milliseconds. */
  baseDelayMs: number;
  /** Upper bound on any single backoff delay. */
  maxDelayMs: number;
  /** Multiplier applied to the delay after each failure. Defaults to 2. */
  factor?: number;
  /** When true (default), each delay is randomised in `[0, computedDelay]`. */
  jitter?: boolean;
  /**
   * Decides whether to retry. Receives the error and the just-completed
   * attempt number (1-indexed). Return false to give up immediately.
   */
  isRetryable: (err: unknown, attempt: number) => boolean;
  /** Optional hook fired before each backoff sleep. Useful for logging. */
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
  /** Sleep override; defaults to `setTimeout`. Exposed for tests. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const factor = options.factor ?? 2;
  const useJitter = options.jitter ?? true;
  const sleep = options.sleep ?? defaultSleep;

  let attempt = 0;
  let lastError: unknown;

  while (attempt < options.maxAttempts) {
    attempt += 1;
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (
        attempt >= options.maxAttempts ||
        !options.isRetryable(err, attempt)
      ) {
        throw err;
      }
      const exp = Math.min(
        options.baseDelayMs * Math.pow(factor, attempt - 1),
        options.maxDelayMs,
      );
      const delayMs = useJitter ? Math.floor(Math.random() * exp) : exp;
      options.onRetry?.(err, attempt, delayMs);
      await sleep(delayMs);
    }
  }

  // Unreachable in practice (the loop either returns or throws), but the
  // type-checker can't see that. Re-throw the last error so callers don't
  // receive `undefined`.
  throw lastError;
}
