/**
 * Decides whether a failure from Horizon (or the underlying HTTP client)
 * is worth retrying. We retry transient/network-level failures only —
 * deterministic Stellar transaction rejections (carrying `result_codes`)
 * will fail again on retry and only waste fee-bumps and ledger sequence.
 */
export function isRetryableStellarError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;

  const e = err as {
    response?: {
      status?: number;
      data?: { extras?: { result_codes?: unknown } };
    };
    code?: string;
    isAxiosError?: boolean;
    message?: string;
  };

  // Horizon told us the transaction was rejected on its merits — never retry.
  if (e.response?.data?.extras?.result_codes) return false;

  const status = e.response?.status;
  if (typeof status === 'number') {
    // 429 (rate limited) and 5xx (server / gateway failures) are worth a retry.
    if (status === 429) return true;
    if (status >= 500 && status < 600) return true;
    // Other 4xx (400, 401, 404, etc.) are deterministic.
    return false;
  }

  // No HTTP response → likely a network-layer failure.
  const transientCodes = new Set([
    'ECONNRESET',
    'ECONNREFUSED',
    'ECONNABORTED',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'ENETUNREACH',
    'EHOSTUNREACH',
    'EPIPE',
  ]);
  if (e.code && transientCodes.has(e.code)) return true;

  // Some clients surface timeouts only via the message.
  if (typeof e.message === 'string' && /timeout/i.test(e.message)) return true;

  return false;
}
