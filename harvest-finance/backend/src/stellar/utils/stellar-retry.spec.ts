import { isRetryableStellarError } from './stellar-retry';

describe('isRetryableStellarError', () => {
  it('does not retry deterministic Stellar rejections (result_codes present)', () => {
    const err = {
      response: {
        status: 400,
        data: { extras: { result_codes: { transaction: 'tx_failed' } } },
      },
    };
    expect(isRetryableStellarError(err)).toBe(false);
  });

  it('retries on HTTP 429 (rate limited)', () => {
    expect(isRetryableStellarError({ response: { status: 429 } })).toBe(true);
  });

  it('retries on HTTP 5xx', () => {
    expect(isRetryableStellarError({ response: { status: 502 } })).toBe(true);
    expect(isRetryableStellarError({ response: { status: 504 } })).toBe(true);
  });

  it('does not retry on other 4xx', () => {
    expect(isRetryableStellarError({ response: { status: 400 } })).toBe(false);
    expect(isRetryableStellarError({ response: { status: 404 } })).toBe(false);
    expect(isRetryableStellarError({ response: { status: 401 } })).toBe(false);
  });

  it('retries on transient network error codes', () => {
    for (const code of [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EAI_AGAIN',
    ]) {
      expect(isRetryableStellarError({ code })).toBe(true);
    }
  });

  it('retries on errors whose message mentions a timeout', () => {
    expect(
      isRetryableStellarError({ message: 'Request timeout exceeded' }),
    ).toBe(true);
  });

  it('does not retry on unknown / non-network errors', () => {
    expect(isRetryableStellarError(new Error('something else'))).toBe(false);
    expect(isRetryableStellarError(null)).toBe(false);
    expect(isRetryableStellarError('string error')).toBe(false);
  });
});
