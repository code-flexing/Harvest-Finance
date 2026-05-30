export type CircuitBreakerState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerStateChange {
  name: string;
  from: CircuitBreakerState;
  to: CircuitBreakerState;
  reason: string;
  failureCount: number;
  retryAfterMs: number;
}

export interface CircuitBreakerSnapshot {
  state: CircuitBreakerState;
  failureCount: number;
  retryAfterMs: number;
}

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold: number;
  resetTimeoutMs: number;
  shouldTrip: (err: unknown) => boolean;
  now?: () => number;
  onStateChange?: (change: CircuitBreakerStateChange) => void;
}

export class CircuitBreakerOpenError extends Error {
  constructor(
    public readonly circuitName: string,
    public readonly retryAfterMs: number,
    context?: string,
  ) {
    super(
      `${circuitName} circuit is open${context ? ` for ${context}` : ''}; retry after ${retryAfterMs}ms`,
    );
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private openedAt = 0;
  private halfOpenProbeInFlight = false;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly now: () => number;

  constructor(private readonly options: CircuitBreakerOptions) {
    this.failureThreshold = Math.max(
      1,
      Math.floor(options.failureThreshold),
    );
    this.resetTimeoutMs = Math.max(1, Math.floor(options.resetTimeoutMs));
    this.now = options.now ?? Date.now;
  }

  async execute<T>(operation: () => Promise<T>, context?: string): Promise<T> {
    const probeAcquired = this.beforeExecute(context);

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure(err);
      throw err;
    } finally {
      if (probeAcquired) {
        this.halfOpenProbeInFlight = false;
      }
    }
  }

  snapshot(): CircuitBreakerSnapshot {
    return {
      state: this.state,
      failureCount: this.failureCount,
      retryAfterMs: this.retryAfterMs(),
    };
  }

  private beforeExecute(context?: string): boolean {
    if (this.state === 'open') {
      if (!this.openTimeoutElapsed()) {
        throw new CircuitBreakerOpenError(
          this.options.name,
          this.retryAfterMs(),
          context,
        );
      }
      this.transitionTo('half_open', 'reset_timeout_elapsed');
    }

    if (this.state === 'half_open') {
      if (this.halfOpenProbeInFlight) {
        throw new CircuitBreakerOpenError(
          this.options.name,
          this.retryAfterMs(),
          context,
        );
      }
      this.halfOpenProbeInFlight = true;
      return true;
    }

    return false;
  }

  private recordSuccess(): void {
    if (this.state === 'half_open') {
      this.transitionTo('closed', 'half_open_probe_succeeded');
      return;
    }
    this.failureCount = 0;
  }

  private recordFailure(err: unknown): void {
    if (!this.options.shouldTrip(err)) {
      if (this.state === 'half_open') {
        this.transitionTo('closed', 'half_open_probe_reached_horizon');
      } else {
        this.failureCount = 0;
      }
      return;
    }

    if (this.state === 'half_open') {
      this.failureCount = 1;
      this.transitionTo('open', 'half_open_probe_failed');
      return;
    }

    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold) {
      this.transitionTo('open', 'failure_threshold_reached');
    }
  }

  private transitionTo(to: CircuitBreakerState, reason: string): void {
    const from = this.state;
    if (from === to) return;

    this.state = to;

    if (to === 'open') {
      this.openedAt = this.now();
    }

    if (to === 'closed') {
      this.failureCount = 0;
      this.openedAt = 0;
    }

    if (to === 'half_open') {
      this.failureCount = 0;
    }

    this.options.onStateChange?.({
      name: this.options.name,
      from,
      to,
      reason,
      failureCount: this.failureCount,
      retryAfterMs: this.retryAfterMs(),
    });
  }

  private openTimeoutElapsed(): boolean {
    return this.now() - this.openedAt >= this.resetTimeoutMs;
  }

  private retryAfterMs(): number {
    if (this.state !== 'open') return 0;
    return Math.max(0, this.resetTimeoutMs - (this.now() - this.openedAt));
  }
}
