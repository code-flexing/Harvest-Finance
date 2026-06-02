
import { parseStellarError, STELLAR_ERROR_MAP, DEFAULT_ERROR_MESSAGE } from '../errors/stellar-errors';

describe('parseStellarError', () => {
  it('should return default message for null/undefined error', () => {
    expect(parseStellarError(null).message).toBe(DEFAULT_ERROR_MESSAGE);
    expect(parseStellarError(undefined).message).toBe(DEFAULT_ERROR_MESSAGE);
  });

  it('should handle User cancelled error', () => {
    const error = "User cancelled";
    const result = parseStellarError(error);
    expect(result.message).toBe(STELLAR_ERROR_MAP.user_cancelled);
    expect(result.code).toBe('user_cancelled');
  });

  it('should parse cryptic op_underfunded error from result_codes', () => {
    const error = {
      response: {
        data: {
          extras: {
            result_codes: {
              operations: ['op_underfunded']
            }
          }
        }
      }
    };
    const result = parseStellarError(error);
    expect(result.message).toBe(STELLAR_ERROR_MAP.op_underfunded);
    expect(result.code).toBe('op_underfunded');
  });

  it('should parse tx_bad_auth error from result_codes', () => {
    const error = {
      response: {
        data: {
          extras: {
            result_codes: {
              transaction: 'tx_bad_auth'
            }
          }
        }
      }
    };
    const result = parseStellarError(error);
    expect(result.message).toBe(STELLAR_ERROR_MAP.tx_bad_auth);
    expect(result.code).toBe('tx_bad_auth');
  });

  it('should find error code within message string', () => {
    const error = { message: "Error: Error respond with [op_low_reserve] code" };
    const result = parseStellarError(error);
    expect(result.message).toBe(STELLAR_ERROR_MAP.op_low_reserve);
    expect(result.code).toBe('op_low_reserve');
  });

  it('should fallback to original message if no code matches', () => {
    const customMessage = "Something very specific failed";
    const error = { message: customMessage };
    const result = parseStellarError(error);
    expect(result.message).toBe(customMessage);
    expect(result.code).toBe('unknown');
  });
});
