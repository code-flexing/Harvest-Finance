/** Supported lifecycle states for a fiat on-ramp checkout session. */
export enum OnRampSessionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export interface OnRampQuoteRequest {
  /** Fiat amount in major currency units (e.g. 100.00 USD). */
  fiatAmount: number;
  /** ISO 4217 currency code — e.g. `USD`, `EUR`. */
  fiatCurrency: string;
  /** Target crypto asset code — e.g. `XLM`, `USDC`. */
  cryptoAsset: string;
  /** Wallet address that will receive the purchased crypto. */
  destinationAddress: string;
}

export interface OnRampQuote {
  quoteId: string;
  fiatAmount: number;
  fiatCurrency: string;
  cryptoAmount: string;
  cryptoAsset: string;
  exchangeRate: number;
  feeAmount: number;
  expiresAt: string;
}

export interface OnRampSessionRequest extends OnRampQuoteRequest {
  userId: string;
  /** Optional quote to bind the session to a previously fetched rate. */
  quoteId?: string;
}

export interface OnRampSession {
  sessionId: string;
  providerName: string;
  checkoutUrl: string;
  status: OnRampSessionStatus;
  fiatAmount: number;
  fiatCurrency: string;
  cryptoAmount: string;
  cryptoAsset: string;
  destinationAddress: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Implemented once per fiat on-ramp vendor. Swap providers by registering a
 * different implementation against the `FIAT_ON_RAMP_PROVIDER` DI token.
 */
export interface FiatOnRampProvider {
  readonly providerName: string;

  getQuote(request: OnRampQuoteRequest): Promise<OnRampQuote>;

  createSession(request: OnRampSessionRequest): Promise<OnRampSession>;

  getSessionStatus(sessionId: string): Promise<OnRampSession>;
}

/** DI token used to register the active `FiatOnRampProvider` with Nest. */
export const FIAT_ON_RAMP_PROVIDER = Symbol('FIAT_ON_RAMP_PROVIDER');
