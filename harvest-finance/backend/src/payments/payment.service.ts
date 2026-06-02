import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { FIAT_ON_RAMP_PROVIDER } from './interfaces/fiat-on-ramp-provider.interface';
import type {
  FiatOnRampProvider,
  OnRampQuote,
  OnRampQuoteRequest,
  OnRampSession,
  OnRampSessionRequest,
} from './interfaces/fiat-on-ramp-provider.interface';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @Inject(FIAT_ON_RAMP_PROVIDER)
    private readonly onRampProvider: FiatOnRampProvider,
  ) {}

  /** Returns the active on-ramp provider identifier (e.g. `mock`, `moonpay`). */
  getProviderName(): string {
    return this.onRampProvider.providerName;
  }

  /**
   * Fetch a fiat-to-crypto quote from the configured on-ramp provider.
   */
  async getOnRampQuote(request: OnRampQuoteRequest): Promise<OnRampQuote> {
    this.validateQuoteRequest(request);

    this.logger.log(
      `Fetching on-ramp quote via ${this.onRampProvider.providerName}: ` +
        `${request.fiatAmount} ${request.fiatCurrency} -> ${request.cryptoAsset}`,
    );

    return this.onRampProvider.getQuote(request);
  }

  /**
   * Create a checkout session so the user can complete a fiat deposit.
   */
  async createOnRampSession(
    request: OnRampSessionRequest,
  ): Promise<OnRampSession> {
    this.validateQuoteRequest(request);

    if (!request.userId?.trim()) {
      throw new BadRequestException('userId is required');
    }

    this.logger.log(
      `Creating on-ramp session for user ${request.userId} via ${this.onRampProvider.providerName}`,
    );

    return this.onRampProvider.createSession(request);
  }

  /**
   * Poll the status of an existing on-ramp checkout session.
   */
  async getOnRampSessionStatus(sessionId: string): Promise<OnRampSession> {
    if (!sessionId?.trim()) {
      throw new BadRequestException('sessionId is required');
    }

    return this.onRampProvider.getSessionStatus(sessionId);
  }

  private validateQuoteRequest(request: OnRampQuoteRequest): void {
    if (!Number.isFinite(request.fiatAmount) || request.fiatAmount <= 0) {
      throw new BadRequestException('fiatAmount must be a positive number');
    }

    if (!request.fiatCurrency?.trim()) {
      throw new BadRequestException('fiatCurrency is required');
    }

    if (!request.cryptoAsset?.trim()) {
      throw new BadRequestException('cryptoAsset is required');
    }

    if (!request.destinationAddress?.trim()) {
      throw new BadRequestException('destinationAddress is required');
    }
  }
}
