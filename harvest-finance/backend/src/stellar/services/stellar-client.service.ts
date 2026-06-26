import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as StellarSdk from 'stellar-sdk';
import { CircuitBreaker, CircuitBreakerOpenError, CircuitBreakerStateChange } from '../utils/circuit-breaker';
import { retry } from '../../common/utils/retry';
import { isRetryableStellarError } from '../utils/stellar-retry';
import { DomainEventNames } from '../../domain-events/domain-event-names';
import { PaymentReceivedEvent } from '../../domain-events/events/payment-received.event';

/**
 * Low-level Stellar client.
 *
 * Owns the Horizon.Server instance, circuit breaker, and payment stream.
 * This is the ONLY place in the codebase that imports the Stellar SDK and
 * talks to the Horizon API. All other services must inject this class.
 */
@Injectable()
export class StellarClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StellarClientService.name);
  readonly server: StellarSdk.Horizon.Server;
  readonly networkPassphrase: string;
  private readonly circuitBreaker: CircuitBreaker;

  // Payment stream state
  private accountId: string;
  private closeStreamFn: (() => void) | null = null;
  private isConnected = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private backoffDelay = 1000;
  private readonly maxBackoffDelay = 30000;
  private lastLedgerCloseTime = new Date();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const network = this.configService.get<string>('STELLAR_NETWORK', 'testnet');

    if (network === 'mainnet') {
      this.server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
      this.networkPassphrase = StellarSdk.Networks.PUBLIC;
    } else {
      this.server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      this.networkPassphrase = StellarSdk.Networks.TESTNET;
    }

    this.accountId =
      this.configService.get<string>('STELLAR_PLATFORM_PUBLIC_KEY') ||
      'GDQP2CHOUZQCIBXIHLFS4D5R7U6WCCSPHQFUG7HOUCQ2YVS6A5W5Y5YG';

    this.circuitBreaker = new CircuitBreaker({
      name: 'stellar-horizon',
      failureThreshold: this.configInt('STELLAR_CIRCUIT_FAILURE_THRESHOLD', 5),
      resetTimeoutMs: this.configInt('STELLAR_CIRCUIT_RESET_TIMEOUT_MS', 30_000),
      shouldTrip: isRetryableStellarError,
      onStateChange: (change: CircuitBreakerStateChange) =>
        this.logger.log(`Stellar Horizon circuit: ${change.from} -> ${change.to} | reason=${change.reason}`),
    });
  }

  onModuleInit() {
    if (this.configService.get<string>('NODE_ENV') !== 'test') {
      this.startStreaming();
    }
  }

  onModuleDestroy() {
    this.stopStreaming();
  }

  // ── HTTP methods ────────────────────────────────────────────────────────────

  /** Submit a transaction with exponential backoff retry. */
  async submitTransaction(
    tx: StellarSdk.Transaction | StellarSdk.FeeBumpTransaction,
    context = 'submitTransaction',
  ): Promise<StellarSdk.Horizon.HorizonApi.SubmitTransactionResponse> {
    return retry(
      () => this.call(context, () => this.server.submitTransaction(tx)),
      {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 2000,
        factor: 2,
        jitter: false,
        isRetryable: isRetryableStellarError,
        onRetry: (err, attempt, delayMs) =>
          this.logger.warn(`Retrying submitTransaction in ${delayMs}ms | attempt=${attempt} err=${(err as Error)?.message}`),
      },
    );
  }

  /** Load a Stellar account by public key. */
  async loadAccount(publicKey: string, context = 'loadAccount'): Promise<StellarSdk.AccountResponse> {
    return this.call(context, () => this.server.loadAccount(publicKey));
  }

  /** Fetch the latest ledger record. */
  async fetchLedger(context = 'fetchLedger'): Promise<StellarSdk.Horizon.ServerApi.LedgerRecord> {
    const page = await this.call(context, () => this.server.ledgers().limit(1).order('desc').call());
    return page.records[0];
  }

  /** Fetch fee statistics from Horizon. */
  async feeStats(context = 'feeStats'): Promise<StellarSdk.Horizon.HorizonApi.FeeStatsResponse> {
    return this.call(context, () => this.server.feeStats());
  }

  /** Execute an operation through the circuit breaker. */
  async call<T>(context: string, operation: () => Promise<T>): Promise<T> {
    try {
      return await this.circuitBreaker.execute(operation, context);
    } catch (err) {
      if (err instanceof CircuitBreakerOpenError) {
        throw new ServiceUnavailableException(
          `Stellar Horizon is temporarily unavailable (context: ${context}). Retry after ${err.retryAfterMs}ms`,
        );
      }
      throw err;
    }
  }

  // ── Payment stream ──────────────────────────────────────────────────────────

  getStreamHealth(): { status: 'up' | 'down'; isConnected: boolean; lastEventTime: Date } {
    return {
      status: this.isConnected ? 'up' : 'down',
      isConnected: this.isConnected,
      lastEventTime: this.lastLedgerCloseTime,
    };
  }

  startStreaming() {
    if (this.closeStreamFn) {
      this.closeStreamFn();
      this.closeStreamFn = null;
    }
    this.logger.log(`Starting Stellar payment stream for account ${this.accountId}`);
    try {
      this.closeStreamFn = this.server
        .payments()
        .forAccount(this.accountId)
        .stream({
          onmessage: (payment) => this.handlePayment(payment),
          onerror: (error) => this.handleStreamError(error),
        });
      this.isConnected = true;
      this.backoffDelay = 1000;
    } catch (err) {
      this.logger.error('Failed to establish Stellar payment stream', err);
      this.handleStreamError(err);
    }
  }

  stopStreaming() {
    if (this.closeStreamFn) {
      try { this.closeStreamFn(); } catch { /* ignore */ }
      this.closeStreamFn = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.isConnected = false;
  }

  private handlePayment(payment: any) {
    this.lastLedgerCloseTime = new Date();
    this.isConnected = true;
    this.backoffDelay = 1000;

    if (payment.to !== this.accountId) return;
    if (!['payment', 'path_payment_strict_receive', 'path_payment_strict_send'].includes(payment.type)) return;

    this.fetchTransactionMemo(payment.transaction_hash)
      .then((memo) => {
        const event = new PaymentReceivedEvent(
          payment.transaction_hash,
          payment.from,
          payment.to,
          parseFloat(payment.amount),
          payment.asset_code || 'XLM',
          memo,
          new Date(payment.created_at || Date.now()),
        );
        this.eventEmitter.emit(DomainEventNames.PAYMENT_RECEIVED, event);
      })
      .catch((err) =>
        this.logger.error(`Failed to fetch tx details for ${payment.transaction_hash}`, err),
      );
  }

  private async fetchTransactionMemo(txHash: string): Promise<string | undefined> {
    try {
      const tx = await this.server.transactions().transaction(txHash).call();
      return tx.memo_type !== 'none' ? tx.memo : undefined;
    } catch (err) {
      this.logger.error(`Error fetching transaction ${txHash}`, err);
      return undefined;
    }
  }

  public async estimateFee(): Promise<number> {
    const feeStats = await this.server.feeStats();
    const p90 = parseFloat(feeStats.fee_charged.p90);
    return Math.ceil(p90 * 1.1);
  }

  public async submitTransaction(
    transaction: StellarSdk.Transaction | StellarSdk.FeeBumpTransaction,
  ): Promise<StellarSdk.Horizon.HorizonApi.SubmitTransactionResponse> {
    const fee = await this.estimateFee();
    const maxFee = this.configService.get<number>('STELLAR_MAX_FEE_STROOPS', 10000);

    if (fee > maxFee) {
      this.logger.warn(
        `Estimated fee ${fee} stroops exceeds cap ${maxFee} stroops — queuing for retry`,
      );
      throw new Error('FEE_EXCEEDS_CAP');
    }

    this.logger.log(`Submitting transaction with fee=${fee} stroops`);
    return this.server.submitTransaction(transaction);
  }

  private handleStreamError(error: any) {
    this.logger.warn(`Stellar payment stream error: ${error?.message || error}`);
    this.isConnected = false;
    if (this.closeStreamFn) {
      try { this.closeStreamFn(); } catch { /* ignore */ }
      this.closeStreamFn = null;
    }
    if (!this.reconnectTimeout) {
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.startStreaming();
      }, this.backoffDelay);
      this.backoffDelay = Math.min(this.backoffDelay * 2, this.maxBackoffDelay);
    }
  }

  private configInt(key: string, defaultValue: number): number {
    const parsed = Number(this.configService.get<string | number>(key));
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : defaultValue;
  }
}
