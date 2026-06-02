import { Injectable, Logger } from '@nestjs/common';
import {
  FiatOnRampProvider,
  OnRampQuote,
  OnRampQuoteRequest,
  OnRampSession,
  OnRampSessionRequest,
  OnRampSessionStatus,
} from '../interfaces/fiat-on-ramp-provider.interface';

/** Deterministic mock rates for local development and tests. */
const MOCK_EXCHANGE_RATES: Record<string, number> = {
  XLM: 0.12,
  USDC: 1.0,
};

const QUOTE_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class MockFiatOnRampProvider implements FiatOnRampProvider {
  readonly providerName = 'mock';

  private readonly logger = new Logger(MockFiatOnRampProvider.name);
  private readonly sessions = new Map<string, OnRampSession>();

  async getQuote(request: OnRampQuoteRequest): Promise<OnRampQuote> {
    const exchangeRate = this.resolveExchangeRate(request.cryptoAsset);
    const feeAmount = Number((request.fiatAmount * 0.015).toFixed(2));
    const netFiat = request.fiatAmount - feeAmount;
    const cryptoAmount = (netFiat / exchangeRate).toFixed(7);

    const quote: OnRampQuote = {
      quoteId: `quote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fiatAmount: request.fiatAmount,
      fiatCurrency: request.fiatCurrency.toUpperCase(),
      cryptoAmount,
      cryptoAsset: request.cryptoAsset.toUpperCase(),
      exchangeRate,
      feeAmount,
      expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
    };

    this.logger.debug(
      `Mock quote ${quote.quoteId}: ${quote.fiatAmount} ${quote.fiatCurrency} -> ${quote.cryptoAmount} ${quote.cryptoAsset}`,
    );

    return quote;
  }

  async createSession(request: OnRampSessionRequest): Promise<OnRampSession> {
    const quote = await this.getQuote(request);
    const now = new Date().toISOString();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const session: OnRampSession = {
      sessionId,
      providerName: this.providerName,
      checkoutUrl: `https://mock-onramp.example/checkout/${sessionId}`,
      status: OnRampSessionStatus.PENDING,
      fiatAmount: quote.fiatAmount,
      fiatCurrency: quote.fiatCurrency,
      cryptoAmount: quote.cryptoAmount,
      cryptoAsset: quote.cryptoAsset,
      destinationAddress: request.destinationAddress,
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(sessionId, session);

    this.logger.log(
      `Mock on-ramp session ${sessionId} created for user ${request.userId}`,
    );

    return session;
  }

  async getSessionStatus(sessionId: string): Promise<OnRampSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`On-ramp session not found: ${sessionId}`);
    }

    return session;
  }

  /** Test helper — advance a mock session to a terminal state. */
  updateSessionStatus(
    sessionId: string,
    status: OnRampSessionStatus,
  ): OnRampSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`On-ramp session not found: ${sessionId}`);
    }

    const updated: OnRampSession = {
      ...session,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  private resolveExchangeRate(cryptoAsset: string): number {
    const rate = MOCK_EXCHANGE_RATES[cryptoAsset.toUpperCase()];
    if (!rate) {
      throw new Error(`Unsupported crypto asset for mock on-ramp: ${cryptoAsset}`);
    }
    return rate;
  }
}
