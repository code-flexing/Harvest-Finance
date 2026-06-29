import { isRetryableStellarError } from './stellar-retry';

describe('isRetryableStellarError', () => {
  describe('result_codes — deterministic Stellar rejections', () => {
    it('does not retry when result_codes contains a transaction code', () => {
      const err = {
        response: {
          status: 400,
          data: { extras: { result_codes: { transaction: 'tx_failed' } } },
        },
      };
      expect(isRetryableStellarError(err)).toBe(false);
    });

    it('does not retry when result_codes contains operation codes', () => {
      const err = {
        response: {
          status: 400,
          data: {
            extras: {
              result_codes: {
                transaction: 'tx_failed',
                operations: ['op_no_trust'],
              },
            },
          },
        },
      };
      expect(isRetryableStellarError(err)).toBe(false);
    });

    it('does not retry tx_bad_seq even on a 5xx response when result_codes is present', () => {
      const err = {
        response: {
          status: 500,
          data: { extras: { result_codes: { transaction: 'tx_bad_seq' } } },
        },
      };
      expect(isRetryableStellarError(err)).toBe(false);
    });
  });

  describe('HTTP 429 — rate limiting', () => {
    it('retries on HTTP 429', () => {
      expect(isRetryableStellarError({ response: { status: 429 } })).toBe(true);
    });
  });

  describe('HTTP 5xx — server / gateway errors', () => {
    it.each([500, 502, 503, 504, 599])('retries on HTTP %i', (status) => {
      expect(isRetryableStellarError({ response: { status } })).toBe(true);
    });

    it('does not retry on HTTP 600 (outside 5xx range)', () => {
      expect(isRetryableStellarError({ response: { status: 600 } })).toBe(
        false,
      );
    });
  });

  describe('HTTP 4xx — client errors (non-retryable)', () => {
    it.each([400, 401, 403, 404, 409])(
      'does not retry on HTTP %i',
      (status) => {
        expect(isRetryableStellarError({ response: { status } })).toBe(false);
      },
    );
  });

  describe('transient network error codes', () => {
    it.each([
      'ECONNRESET',
      'ECONNREFUSED',
      'ECONNABORTED',
      'ETIMEDOUT',
      'EAI_AGAIN',
      'ENETUNREACH',
      'EHOSTUNREACH',
      'EPIPE',
    ])('retries on error code %s', (code) => {
      expect(isRetryableStellarError({ code })).toBe(true);
    });

    it('does not retry on an unrecognised network error code', () => {
      expect(isRetryableStellarError({ code: 'EUNKNOWN' })).toBe(false);
    });
  });

  describe('timeout messages', () => {
    it.each([
      'Request timeout exceeded',
      'TIMEOUT',
      'connection Timeout',
      'read timeout after 30s',
    ])('retries when message is "%s"', (message) => {
      expect(isRetryableStellarError({ message })).toBe(true);
    });

    it('does not retry when message does not mention timeout', () => {
      expect(isRetryableStellarError({ message: 'Bad request' })).toBe(false);
    });
  });

  describe('non-retryable / edge cases', () => {
    it('does not retry on a plain Error with no network context', () => {
      expect(isRetryableStellarError(new Error('something else'))).toBe(false);
    });

    it('does not retry on null', () => {
      expect(isRetryableStellarError(null)).toBe(false);
    });

    it('does not retry on a primitive string', () => {
      expect(isRetryableStellarError('string error')).toBe(false);
    });

    it('does not retry on a number', () => {
      expect(isRetryableStellarError(500)).toBe(false);
    });

    it('does not retry on an empty object', () => {
      expect(isRetryableStellarError({})).toBe(false);
    });
  });
});
