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

  // Horizon embeds `result_codes` when the transaction was evaluated and
  // rejected by the Stellar network (e.g. tx_bad_seq, op_no_trust).
  // These are deterministic: the same transaction will be rejected again
  // regardless of how many times we retry, so retrying only burns fees
  // and consumes sequence numbers unnecessarily.
  if (e.response?.data?.extras?.result_codes) return false;

  const status = e.response?.status;
  if (typeof status === 'number') {
    // 429 Too Many Requests — Horizon is rate-limiting this client.
    // The request itself is valid; we just need to back off and try again.
    if (status === 429) return true;

    // 5xx Server / Gateway errors — the failure is on Horizon's side
    // (overload, restart, upstream timeout, etc.), not in our transaction.
    // These are transient by nature and safe to retry after a delay.
    if (status >= 500 && status < 600) return true;

    // All other 4xx codes (400 Bad Request, 401 Unauthorized, 403 Forbidden,
    // 404 Not Found, 409 Conflict, etc.) indicate a problem with the request
    // itself. Retrying an invalid or unauthorized request will always produce
    // the same error, so we treat them as permanent failures.
    return false;
  }

  // No HTTP response at all → the request never reached Horizon.
  // These Node.js / OS-level error codes represent transient network
  // conditions (connection dropped, DNS hiccup, unreachable host) that
  // are safe to retry once connectivity is restored.
  const transientCodes = new Set([
    'ECONNRESET',   // Connection was forcibly closed by the remote peer
    'ECONNREFUSED', // Nothing is listening on the target port (Horizon down/restarting)
    'ECONNABORTED', // Connection was aborted before the response completed
    'ETIMEDOUT',    // TCP handshake or response timed out at the OS level
    'EAI_AGAIN',    // DNS resolution failed transiently (retry-able lookup error)
    'ENETUNREACH',  // No route to the network (temporary routing issue)
    'EHOSTUNREACH', // No route to the specific host
    'EPIPE',        // Write to a closed socket (connection dropped mid-request)
  ]);
  if (e.code && transientCodes.has(e.code)) return true;

  // Some HTTP clients (e.g. axios with a custom adapter) surface request
  // timeouts only through the error message rather than a structured code.
  // Catch those as well so timeout handling is consistent.
  if (typeof e.message === 'string' && /timeout/i.test(e.message)) return true;

  // Anything else (unexpected error shape, unknown code, etc.) is treated
  // as non-retryable to avoid infinite loops on unforeseen error types.
  return false;
}
