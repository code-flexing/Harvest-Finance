import { Injectable, Logger } from '@nestjs/common';
import {
  FiatOnRampProvider,
  OnRampQuote,
  OnRampQuoteRequest,
  OnRampSession,
  OnRampSessionRequest,
  OnRampSessionStatus,
} from '../interfaces/fiat-on-ramp-provider.interface';

@Injectable()
export class PaystackFiatOnRampProvider implements FiatOnRampProvider {
  readonly providerName = 'paystack';
  private readonly logger = new Logger(PaystackFiatOnRampProvider.name);
  private readonly sessions = new Map<string, OnRampSession>();

  async getQuote(request: OnRampQuoteRequest): Promise<OnRampQuote> {
    if (request.fiatCurrency.toUpperCase() !== 'NGN') {
      throw new Error('Paystack provider only supports NGN fiat currency');
    }
    const exchangeRate = 1200; // Mock rate for NGN -> USDC
    const feeAmount = Number((request.fiatAmount * 0.015).toFixed(2));
    const netFiat = request.fiatAmount - feeAmount;
    const cryptoAmount = (netFiat / exchangeRate).toFixed(7);

    return {
      quoteId: `ps_quote_${Date.now()}`,
      fiatAmount: request.fiatAmount,
      fiatCurrency: 'NGN',
      cryptoAmount,
      cryptoAsset: request.cryptoAsset.toUpperCase(),
      exchangeRate,
      feeAmount,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }

  async createSession(request: OnRampSessionRequest): Promise<OnRampSession> {
    const quote = await this.getQuote(request);
    const sessionId = `ps_session_${Date.now()}`;
    const now = new Date().toISOString();

    const session: OnRampSession = {
      sessionId,
      providerName: this.providerName,
      checkoutUrl: `https://checkout.paystack.com/${sessionId}`,
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
    this.logger.log(`Paystack session ${sessionId} created for user ${request.userId}`);
    return session;
  }

  async getSessionStatus(sessionId: string): Promise<OnRampSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`On-ramp session not found: ${sessionId}`);
    }
    return session;
  }
}
