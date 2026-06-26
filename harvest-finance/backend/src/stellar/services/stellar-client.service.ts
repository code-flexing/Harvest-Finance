import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as StellarSdk from 'stellar-sdk';
import { DomainEventNames } from '../../domain-events/domain-event-names';
import { PaymentReceivedEvent } from '../../domain-events/events/payment-received.event';

@Injectable()
export class StellarClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StellarClientService.name);
  private server: StellarSdk.Horizon.Server;
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
    } else {
      this.server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    }
    
    this.accountId = this.configService.get<string>('STELLAR_PLATFORM_PUBLIC_KEY') || 'GDQP2CHOUZQCIBXIHLFS4D5R7U6WCCSPHQFUG7HOUCQ2YVS6A5W5Y5YG';
  }

  onModuleInit() {
    const isTest = this.configService.get<string>('NODE_ENV') === 'test';
    if (!isTest) {
      this.startStreaming();
    } else {
      this.logger.log('Skipping Stellar streaming connection in test environment');
    }
  }

  onModuleDestroy() {
    this.stopStreaming();
  }

  public getStreamHealth(): { status: 'up' | 'down'; isConnected: boolean; lastEventTime: Date } {
    return {
      status: this.isConnected ? 'up' : 'down',
      isConnected: this.isConnected,
      lastEventTime: this.lastLedgerCloseTime,
    };
  }

  // Exposed for testing/triggering manually
  public startStreaming() {
    if (this.closeStreamFn) {
      this.closeStreamFn();
      this.closeStreamFn = null;
    }

    this.logger.log(`Starting Stellar payment channel stream for account ${this.accountId}`);
    
    try {
      this.closeStreamFn = this.server
        .payments()
        .forAccount(this.accountId)
        .stream({
          onmessage: (payment) => {
            this.handlePayment(payment);
          },
          onerror: (error) => {
            this.handleStreamError(error);
          },
        });
      
      this.isConnected = true;
      this.backoffDelay = 1000;
    } catch (err) {
      this.logger.error('Failed to establish Stellar payment stream', err);
      this.handleStreamError(err);
    }
  }

  public stopStreaming() {
    if (this.closeStreamFn) {
      try {
        this.closeStreamFn();
      } catch (e) {
        // ignore
      }
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
    
    if (payment.to !== this.accountId) {
      return;
    }

    if (payment.type !== 'payment' && payment.type !== 'path_payment_strict_receive' && payment.type !== 'path_payment_strict_send') {
      return;
    }

    this.logger.log(`Incoming Stellar payment detected: ${payment.amount} ${payment.asset_code || 'XLM'} from ${payment.from}`);

    this.fetchTransactionMemo(payment.transaction_hash)
      .then((memo) => {
        const amount = parseFloat(payment.amount);
        const assetCode = payment.asset_code || 'XLM';
        
        const event = new PaymentReceivedEvent(
          payment.transaction_hash,
          payment.from,
          payment.to,
          amount,
          assetCode,
          memo,
          new Date(payment.created_at || Date.now()),
        );

        this.eventEmitter.emit(DomainEventNames.PAYMENT_RECEIVED, event);
      })
      .catch((err) => {
        this.logger.error(`Failed to fetch transaction details for hash ${payment.transaction_hash}`, err);
      });
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
    this.logger.warn(`Stellar payment stream disconnected or encountered an error: ${error?.message || error}`);
    this.isConnected = false;
    
    if (this.closeStreamFn) {
      try {
        this.closeStreamFn();
      } catch (e) {
        // ignore
      }
      this.closeStreamFn = null;
    }

    if (!this.reconnectTimeout) {
      this.logger.log(`Scheduling reconnect in ${this.backoffDelay}ms`);
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.startStreaming();
      }, this.backoffDelay);

      this.backoffDelay = Math.min(this.backoffDelay * 2, this.maxBackoffDelay);
    }
  }
}
