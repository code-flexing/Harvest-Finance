import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsService } from '../../common/secrets/secrets.service';
import * as StellarSdk from 'stellar-sdk';
import { CustomLoggerService } from '../../logger/custom-logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DomainEventNames,
  EscrowChangeAction,
  EscrowChangedEvent,
} from '../../domain-events';
import {
  EscrowCreateParams,
  EscrowResult,
  ReleasePaymentParams,
  RefundParams,
  TransactionStatus,
  MultiSigSetupParams,
  FeeEstimate,
  AccountInfo,
  ReleaseUpfrontPaymentParams,
  FeeBumpResult,
  PriorityFeeInfo,
  StellarBalance,
} from '../interfaces/stellar.interfaces';
import { StellarClientService } from './stellar-client.service';

export class FeeCapExceededException extends ServiceUnavailableException {
  constructor(withBuffer: number, maxFee: number) {
    super(
      `Fee cap exceeded: estimated ${withBuffer} stroops > cap ${maxFee} stroops. Operation queued for retry when fee cap is exceeded.`,
    );
  }
}

@Injectable()
export class StellarService implements OnModuleInit {
  private readonly logger = new Logger(StellarService.name);
  private readonly platformPublicKey: string;
  private platformSecretKey: string;
  private structuredLogger: CustomLoggerService;

  constructor(
    private readonly configService: ConfigService,
    private readonly secretsService: SecretsService,
    customLogger: CustomLoggerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly client: StellarClientService,
  ) {
    this.structuredLogger = customLogger;

    const network = this.configService.get<string>('STELLAR_NETWORK', 'testnet');
    if (network === 'mainnet') {
      this.logger.warn('⚠️  Running on Stellar MAINNET');
    } else {
      this.logger.log('✅ Running on Stellar TESTNET');
    }

    this.platformPublicKey = this.configService.getOrThrow<string>(
      'STELLAR_PLATFORM_PUBLIC_KEY',
    );
  }

  async onModuleInit() {
    const secret = await this.secretsService.getSecret(
      'STELLAR_PLATFORM_SECRET_KEY',
    );
    if (!secret) {
      this.logger.error(
        'Failed to load STELLAR_PLATFORM_SECRET_KEY from secrets provider',
      );
      throw new InternalServerErrorException(
        'Platform secret key configuration missing',
      );
    }
    this.platformSecretKey = secret;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ACCOUNT MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  async getAccountInfo(publicKey: string): Promise<AccountInfo> {
    this.validatePublicKey(publicKey);
    try {
      const account = await this.loadHorizonAccount(
        publicKey,
        `getAccountInfo(${publicKey})`,
      );
      const xlmBalance = account.balances.find(
        (b) => b.asset_type === 'native',
      );

      return {
        publicKey,
        balance: xlmBalance?.balance ?? '0',
        sequence: account.sequence,
        signers: account.signers.map((s) => ({ key: s.key, weight: s.weight })),
        thresholds: {
          low: account.thresholds.low_threshold,
          med: account.thresholds.med_threshold,
          high: account.thresholds.high_threshold,
        },
      };
    } catch (err) {
      this.handleStellarError(err, `getAccountInfo(${publicKey})`);
    }
  }

  /**
   * Returns the full list of asset balances for a Stellar account.
   * Unlike `getAccountInfo`, this preserves non-native assets so callers
   * can aggregate portfolios across multiple tokens.
   */
  async getAccountBalances(
    publicKey: string,
  ): Promise<
    { assetCode: string; assetIssuer: string | null; balance: string }[]
  > {
    this.validatePublicKey(publicKey);
    try {
      const account = await this.loadHorizonAccount(
        publicKey,
        `getAccountBalances(${publicKey})`,
      );
      return account.balances.map((b: StellarBalance) => ({
        assetCode: b.asset_type === 'native' ? 'XLM' : b.asset_code!,
        assetIssuer:
          b.asset_type === 'native' ? null : (b.asset_issuer ?? null),
        balance: String(b.balance ?? '0'),
      }));
    } catch (err) {
      this.handleStellarError(err, `getAccountBalances(${publicKey})`);
    }
  }

  private getPositiveIntegerConfig(key: string, fallback: number): number {
    const val = this.configService.get<string>(key);
    if (!val) return fallback;
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed <= 0) {
      this.logger.warn(`Invalid config for ${key}: ${val}. Using fallback ${fallback}`);
      return fallback;
    }
    return parsed;
  }

  /**
   * Returns a paginated slice of transactions for a Stellar account.
   * Wraps Horizon's cursor-based pagination with simple skip/limit semantics
   * to keep JSON responses bounded.
   */
  async getAccountTransactions(
    publicKey: string,
    skip = 0,
    limit = 20,
    order: 'asc' | 'desc' = 'desc',
  ): Promise<{
    total: number | null;
    skip: number;
    limit: number;
    order: 'asc' | 'desc';
    records: any[];
    nextCursor: string | null;
    prevCursor: string | null;
  }> {
    this.validatePublicKey(publicKey);

    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const safeSkip = Math.max(skip, 0);

    try {
      let remainingToSkip = safeSkip;
      let cursor: string | undefined;
      const pageSize = Math.min(
        200,
        Math.max(safeLimit, remainingToSkip > 0 ? 200 : safeLimit),
      );

      while (remainingToSkip >= pageSize) {
        const call = this.client.server
          .transactions()
          .forAccount(publicKey)
          .order(order)
          .limit(pageSize);
        if (cursor) call.cursor(cursor);

        const page = await this.callHorizon(
          `getAccountTransactions(${publicKey})`,
          () => call.call(),
        );
        if (page.records.length === 0) {
          return {
            total: null,
            skip: safeSkip,
            limit: safeLimit,
            order,
            records: [],
            nextCursor: null,
            prevCursor: null,
          };
        }

        cursor = page.records[page.records.length - 1].paging_token;
        remainingToSkip -= page.records.length;

        if (page.records.length < pageSize) {
          return {
            total: null,
            skip: safeSkip,
            limit: safeLimit,
            order,
            records: [],
            nextCursor: null,
            prevCursor: null,
          };
        }
      }

      const finalPageSize = Math.min(200, remainingToSkip + safeLimit);
      const finalCall = this.client.server
        .transactions()
        .forAccount(publicKey)
        .order(order)
        .limit(finalPageSize);
      if (cursor) finalCall.cursor(cursor);

      const finalPage = await this.callHorizon(
        `getAccountTransactions(${publicKey})`,
        () => finalCall.call(),
      );
      const slice = finalPage.records.slice(
        remainingToSkip,
        remainingToSkip + safeLimit,
      );

      const mapped = slice.map((tx: any) => ({
        hash: tx.hash,
        ledger: tx.ledger,
        createdAt: tx.created_at,
        sourceAccount: tx.source_account,
        feeCharged: tx.fee_charged,
        operationCount: tx.operation_count,
        successful: tx.successful,
        memo: tx.memo ?? null,
        memoType: tx.memo_type ?? null,
        pagingToken: tx.paging_token,
      }));

      return {
        total: null,
        skip: safeSkip,
        limit: safeLimit,
        order,
        records: mapped,
        nextCursor:
          slice.length > 0 ? slice[slice.length - 1].paging_token : null,
        prevCursor: slice.length > 0 ? slice[0].paging_token : null,
      };
    } catch (err) {
      this.handleStellarError(err, `getAccountTransactions(${publicKey})`);
    }
  }

  /**
   * Decodes XDR for all transactions in a history slice to provide
   * human-readable operation details.
   */
  async getDecodedAccountTransactions(
    publicKey: string,
    skip = 0,
    limit = 20,
    order: 'asc' | 'desc' = 'desc',
  ): Promise<{
    skip: number;
    limit: number;
    order: 'asc' | 'desc';
    records: any[];
  }> {
    const history = await this.getAccountTransactions(
      publicKey,
      skip,
      limit,
      order,
    );

    const decodedRecords = await Promise.all(
      history.records.map(async (txMeta: any) => {
        try {
          const fullTx = await this.callHorizon(
            `getDecodedAccountTransactions(${txMeta.hash})`,
            () => this.client.server.transactions().transaction(txMeta.hash).call(),
          );
          const envelope = StellarSdk.TransactionBuilder.fromXDR(
            fullTx.envelope_xdr,
            this.client.networkPassphrase,
          );

          const operations =
            envelope instanceof StellarSdk.FeeBumpTransaction
              ? envelope.innerTransaction.operations
              : envelope.operations;

          return {
            ...txMeta,
            operations: operations.map((op) => ({
              type: op.type,
              details: this.sanitizeOperationDetails(op),
            })),
          };
        } catch (err) {
          this.logger.warn(
            `Failed to decode XDR for tx ${txMeta.hash}: ${err.message}`,
          );
          return { ...txMeta, operations: [] };
        }
      }),
    );

    return {
      skip: history.skip,
      limit: history.limit,
      order: history.order,
      records: decodedRecords,
    };
  }

  private sanitizeOperationDetails(op: any): Record<string, any> {
    const details: Record<string, any> = { ...op };
    delete details.type; // already in the outer object

    // Convert buffers/bigints to strings for JSON safety
    for (const key in details) {
      if (details[key] instanceof Buffer) {
        details[key] = details[key].toString('hex');
      } else if (typeof details[key] === 'bigint') {
        details[key] = details[key].toString();
      } else if (details[key] instanceof StellarSdk.Asset) {
        details[key] = details[key].toString();
      }
    }
    return details;
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.loadHorizonAccount(this.platformPublicKey, 'verifyConnection');
      this.logger.log(
        `Stellar connection OK — platform account: ${this.platformPublicKey}`,
      );
      return true;
    } catch (err) {
      this.logger.error('Stellar connection FAILED', err);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UPFRONT PAYMENT (60%)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Releases 60% upfront payment to the farmer for a given order.
   * @param params { orderId, farmerPublicKey, amount, assetCode, assetIssuer }
   */
  async releaseUpfrontPayment(
    params: ReleaseUpfrontPaymentParams,
  ): Promise<TransactionStatus> {
    const { orderId, farmerPublicKey, amount, assetCode, assetIssuer } = params;
    this.logger.log(
      `Releasing upfront payment (60%) | order=${orderId} farmer=${farmerPublicKey} amount=${amount}`,
    );

    this.validatePublicKey(farmerPublicKey);
    this.validateAmount(amount);

    const asset = this.resolveAsset(assetCode, assetIssuer);
    const platformKeypair = StellarSdk.Keypair.fromSecret(
      this.platformSecretKey,
    );
    const platformAccount = await this.loadHorizonAccount(
      this.platformPublicKey,
      'releaseUpfrontPayment.loadPlatformAccount',
    );

    const transaction = new StellarSdk.TransactionBuilder(platformAccount, {
      fee: await this.getBaseFee(),
      networkPassphrase: this.client.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: farmerPublicKey,
          asset,
          amount,
        }),
      )
      .addMemo(StellarSdk.Memo.text(`HF-upfront:${orderId}`.substring(0, 28)))
      .setTimeout(30)
      .build();

    transaction.sign(platformKeypair);

    if (params.priorityFeeStroops) {
      this.logger.log(
        `Using fee-bump for upfront payment | priorityFee=${params.priorityFeeStroops} stroops`,
      );
      const bumpResult = await this.submitWithFeeBump(
        transaction.toXDR(),
        this.platformSecretKey,
        params.priorityFeeStroops,
      );
      return {
        transactionHash: bumpResult.innerTransactionHash,
        status: 'success',
        ledger: bumpResult.ledger,
        createdAt: bumpResult.createdAt,
        fee: bumpResult.feeCharged,
      };
    }

    try {
      const response = await this.submitWithRetry(
        transaction,
        'releaseUpfrontPayment',
      );
      this.logger.log(`Upfront payment released | txHash=${response.hash}`);
      return {
        transactionHash: response.hash,
        status: 'success',
        ledger: response.ledger,
        createdAt: new Date(),
        fee: '0',
      };
    } catch (err) {
      this.handleStellarError(err, 'releaseUpfrontPayment');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ESCROW — CLAIMABLE BALANCES
  // ─────────────────────────────────────────────────────────────────────────────

  async createEscrow(params: EscrowCreateParams): Promise<EscrowResult> {
    const {
      farmerPublicKey,
      buyerPublicKey,
      amount,
      assetCode,
      assetIssuer,
      deadlineUnixTimestamp,
      orderId,
    } = params;

    this.logger.log(
      `Creating escrow | order=${orderId} amount=${amount} asset=${assetCode ?? 'XLM'}`,
    );

    this.validatePublicKey(farmerPublicKey);
    this.validatePublicKey(buyerPublicKey);
    this.validateAmount(amount);

    if (deadlineUnixTimestamp <= Math.floor(Date.now() / 1000)) {
      throw new BadRequestException('Escrow deadline must be in the future');
    }

    const asset = this.resolveAsset(assetCode, assetIssuer);
    const platformAccount = await this.loadHorizonAccount(
      this.platformPublicKey,
      'createEscrow.loadPlatformAccount',
    );

    // Predicate: farmer can claim unconditionally
    const farmerPredicate = StellarSdk.Claimant.predicateUnconditional();

    // Predicate: buyer can only reclaim after the deadline
    const buyerPredicate = StellarSdk.Claimant.predicateNot(
      StellarSdk.Claimant.predicateBeforeAbsoluteTime(
        deadlineUnixTimestamp.toString(),
      ),
    );

    const claimants = [
      new StellarSdk.Claimant(farmerPublicKey, farmerPredicate),
      new StellarSdk.Claimant(buyerPublicKey, buyerPredicate),
    ];

    const transaction = new StellarSdk.TransactionBuilder(platformAccount, {
      fee: await this.getBaseFee(),
      networkPassphrase: this.client.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.createClaimableBalance({
          asset,
          amount,
          claimants,
        }),
      )
      .addMemo(StellarSdk.Memo.text(`HF-escrow:${orderId}`.substring(0, 28)))
      .setTimeout(30)
      .build();

    const platformKeypair = StellarSdk.Keypair.fromSecret(
      this.platformSecretKey,
    );
    transaction.sign(platformKeypair);

    if (params.priorityFeeStroops) {
      this.logger.log(
        `Using fee-bump for escrow creation | priorityFee=${params.priorityFeeStroops} stroops`,
      );
      const bumpResult = await this.submitWithFeeBump(
        transaction.toXDR(),
        this.platformSecretKey,
        params.priorityFeeStroops,
      );
      const response = await this.callHorizon(
        'createEscrow.lookupFeeBumpTransaction',
        () =>
          this.client.server
            .transactions()
            .transaction(bumpResult.feeBumpTransactionHash)
            .call(),
      );
      const balanceId = this.extractBalanceId(response as any);

      const escrowResult: EscrowResult = {
        balanceId,
        transactionHash: bumpResult.innerTransactionHash,
        feeBumpTransactionHash: bumpResult.feeBumpTransactionHash,
        createdAt: bumpResult.createdAt,
        expiresAt: new Date(deadlineUnixTimestamp * 1000),
        amount,
        assetCode: assetCode ?? 'XLM',
        farmerPublicKey,
        buyerPublicKey,
        orderId,
      };
      this.emitEscrowChanged('created', {
        orderId: escrowResult.orderId,
        transactionHash: escrowResult.transactionHash,
        balanceId: escrowResult.balanceId,
        amount: escrowResult.amount,
      });
      return escrowResult;
    }

    try {
      const response = await this.submitWithRetry(transaction, 'createEscrow');
      const balanceId = this.extractBalanceId(response);

      this.logger.log(
        `Escrow created | balanceId=${balanceId} txHash=${response.hash}`,
      );

      const escrowResult: EscrowResult = {
        balanceId,
        transactionHash: response.hash,
        createdAt: new Date(),
        expiresAt: new Date(deadlineUnixTimestamp * 1000),
        amount,
        assetCode: assetCode ?? 'XLM',
        farmerPublicKey,
        buyerPublicKey,
        orderId,
      };
      this.emitEscrowChanged('created', {
        orderId: escrowResult.orderId,
        transactionHash: escrowResult.transactionHash,
        balanceId: escrowResult.balanceId,
        amount: escrowResult.amount,
      });
      return escrowResult;
    } catch (err) {
      this.handleStellarError(err, 'createEscrow');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PAYMENT RELEASE
  // ─────────────────────────────────────────────────────────────────────────────

  async releasePayment(
    params: ReleasePaymentParams,
  ): Promise<TransactionStatus> {
    const { balanceId, farmerPublicKey, farmerSecretKey } = params;

    this.logger.log(
      `Releasing payment | balanceId=${balanceId} farmer=${farmerPublicKey}`,
    );

    const farmerKeypair = StellarSdk.Keypair.fromSecret(farmerSecretKey);
    if (farmerKeypair.publicKey() !== farmerPublicKey) {
      throw new BadRequestException(
        'farmerSecretKey does not match farmerPublicKey',
      );
    }

    const farmerAccount = await this.loadHorizonAccount(
      farmerPublicKey,
      'releasePayment.loadFarmerAccount',
    );

    const transaction = new StellarSdk.TransactionBuilder(farmerAccount, {
      fee: await this.getBaseFee(),
      networkPassphrase: this.client.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.claimClaimableBalance({
          balanceId: balanceId,
        }),
      )
      .addMemo(StellarSdk.Memo.text('HF-release'))
      .setTimeout(30)
      .build();

    transaction.sign(farmerKeypair);

    if (params.priorityFeeStroops) {
      this.logger.log(
        `Using fee-bump for payment release | priorityFee=${params.priorityFeeStroops} stroops`,
      );
      const bumpResult = await this.submitWithFeeBump(
        transaction.toXDR(),
        this.platformSecretKey, // Platform pays the bump fee to ensure release
        params.priorityFeeStroops,
      );
      const releaseStatus: TransactionStatus = {
        transactionHash: bumpResult.innerTransactionHash,
        status: 'success',
        ledger: bumpResult.ledger,
        createdAt: bumpResult.createdAt,
        fee: bumpResult.feeCharged,
      };
      this.emitEscrowChanged('released', {
        orderId: params.balanceId,
        transactionHash: releaseStatus.transactionHash,
        balanceId: params.balanceId,
      });
      return releaseStatus;
    }

    try {
      const response = await this.submitWithRetry(
        transaction,
        'releasePayment',
      );
      this.logger.log(`Payment released | txHash=${response.hash}`);

      const releaseStatus: TransactionStatus = {
        transactionHash: response.hash,
        status: 'success',
        ledger: response.ledger,
        createdAt: new Date(),
        fee: '0',
      };
      this.emitEscrowChanged('released', {
        orderId: params.balanceId,
        transactionHash: releaseStatus.transactionHash,
        balanceId: params.balanceId,
      });
      return releaseStatus;
    } catch (err) {
      this.handleStellarError(err, 'releasePayment');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REFUND
  // ─────────────────────────────────────────────────────────────────────────────

  async refundEscrow(params: RefundParams): Promise<TransactionStatus> {
    const { balanceId, buyerPublicKey, buyerSecretKey } = params;

    this.logger.log(
      `Processing refund | balanceId=${balanceId} buyer=${buyerPublicKey}`,
    );

    const buyerKeypair = StellarSdk.Keypair.fromSecret(buyerSecretKey);
    if (buyerKeypair.publicKey() !== buyerPublicKey) {
      throw new BadRequestException(
        'buyerSecretKey does not match buyerPublicKey',
      );
    }

    const buyerAccount = await this.loadHorizonAccount(
      buyerPublicKey,
      'refundEscrow.loadBuyerAccount',
    );

    const transaction = new StellarSdk.TransactionBuilder(buyerAccount, {
      fee: await this.getBaseFee(),
      networkPassphrase: this.client.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.claimClaimableBalance({
          balanceId: balanceId,
        }),
      )
      .addMemo(StellarSdk.Memo.text('HF-refund'))
      .setTimeout(30)
      .build();

    transaction.sign(buyerKeypair);

    if (params.priorityFeeStroops) {
      this.logger.log(
        `Using fee-bump for escrow refund | priorityFee=${params.priorityFeeStroops} stroops`,
      );
      const bumpResult = await this.submitWithFeeBump(
        transaction.toXDR(),
        this.platformSecretKey, // Platform pays the bump fee to ensure refund
        params.priorityFeeStroops,
      );
      const refundStatus: TransactionStatus = {
        transactionHash: bumpResult.innerTransactionHash,
        status: 'success',
        ledger: bumpResult.ledger,
        createdAt: bumpResult.createdAt,
        fee: bumpResult.feeCharged,
      };
      this.emitEscrowChanged('refunded', {
        orderId: params.balanceId,
        transactionHash: refundStatus.transactionHash,
        balanceId: params.balanceId,
      });
      return refundStatus;
    }

    try {
      const response = await this.submitWithRetry(transaction, 'refund');
      this.logger.log(`Refund processed | txHash=${response.hash}`);

      const refundStatus: TransactionStatus = {
        transactionHash: response.hash,
        status: 'success',
        ledger: response.ledger,
        createdAt: new Date(),
        fee: '0',
      };
      this.emitEscrowChanged('refunded', {
        orderId: params.balanceId,
        transactionHash: refundStatus.transactionHash,
        balanceId: params.balanceId,
      });
      return refundStatus;
    } catch (err) {
      this.handleStellarError(err, 'refundEscrow');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MULTI-SIGNATURE ACCOUNT SETUP
  // ─────────────────────────────────────────────────────────────────────────────

  async setupMultiSigAccount(
    params: MultiSigSetupParams,
  ): Promise<TransactionStatus> {
    const { primaryPublicKey, cosignerPublicKeys, threshold, sourceSecretKey } =
      params;

    this.logger.log(
      `Setting up multisig | account=${primaryPublicKey} threshold=${threshold}/${cosignerPublicKeys.length + 1}`,
    );

    if (threshold > cosignerPublicKeys.length + 1) {
      throw new BadRequestException(
        'Threshold cannot exceed total number of signers',
      );
    }

    for (const key of cosignerPublicKeys) {
      this.validatePublicKey(key);
    }

    const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecretKey);
    const sourceAccount = await this.loadHorizonAccount(
      sourceKeypair.publicKey(),
      'setupMultiSigAccount.loadSourceAccount',
    );

    const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: await this.getBaseFee(),
      networkPassphrase: this.client.networkPassphrase,
    });

    // Set thresholds — master key weight = 1 (cannot sign alone when threshold > 1)
    txBuilder.addOperation(
      StellarSdk.Operation.setOptions({
        masterWeight: 1,
        lowThreshold: threshold,
        medThreshold: threshold,
        highThreshold: threshold,
      }),
    );

    // Add each cosigner with weight 1
    for (const cosignerKey of cosignerPublicKeys) {
      txBuilder.addOperation(
        StellarSdk.Operation.setOptions({
          signer: {
            ed25519PublicKey: cosignerKey,
            weight: 1,
          },
        }),
      );
    }

    const transaction = txBuilder.setTimeout(30).build();
    transaction.sign(sourceKeypair);

    try {
      const response = await this.submitWithRetry(transaction, 'setupMultiSig');
      this.logger.log(`Multisig configured | txHash=${response.hash}`);

      return {
        transactionHash: response.hash,
        status: 'success',
        ledger: response.ledger,
        createdAt: new Date(),
        fee: '0',
      };
    } catch (err) {
      this.handleStellarError(err, 'setupMultiSigAccount');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TRANSACTION MONITORING
  // ─────────────────────────────────────────────────────────────────────────────

  async getTransactionStatus(
    transactionHash: string,
  ): Promise<TransactionStatus> {
    try {
      const tx = await this.callHorizon(
        `getTransactionStatus(${transactionHash})`,
        () => this.client.server.transactions().transaction(transactionHash).call(),
      );
      const ops = await this.callHorizon(
        `getTransactionStatus.operations(${transactionHash})`,
        () => this.client.server.operations().forTransaction(transactionHash).call(),
      );

      const operations = ops.records.map((op: any) => ({
        type: op.type,
        from: op.from,
        to: op.to,
        amount: op.amount,
        asset:
          op.asset_type === 'native'
            ? 'XLM'
            : `${op.asset_code}:${op.asset_issuer}`,
      }));

      return {
        transactionHash,
        status: tx.successful ? 'success' : 'failed',
        ledger: tx.ledger_attr
          ? Number(tx.ledger_attr)
          : typeof tx.ledger === 'number' || typeof tx.ledger === 'string'
            ? Number(tx.ledger)
            : 0,
        createdAt: tx.created_at ? new Date(tx.created_at) : new Date(),
        fee: this.stroopsToXlm(tx.fee_charged ? String(tx.fee_charged) : '0'),
        operations,
      };
    } catch (err) {
      this.handleStellarError(err, 'getTransactionStatus');
    }
  }

  async getClaimableBalances(publicKey: string): Promise<any[]> {
    this.validatePublicKey(publicKey);
    try {
      const response = await this.callHorizon(
        `getClaimableBalances(${publicKey})`,
        () => this.client.server.claimableBalances().claimant(publicKey).call(),
      );
      return response.records;
    } catch (err) {
      this.handleStellarError(err, 'getClaimableBalances');
    }
  }

  monitorAccount(
    publicKey: string,
    onTransaction: (tx: any) => void,
  ): () => void {
    this.validatePublicKey(publicKey);

    this.logger.log(`Starting transaction stream for account: ${publicKey}`);

    const closeStream = this.client.server
      .transactions()
      .forAccount(publicKey)
      .cursor('now')
      .stream({
        onmessage: (tx) => {
          this.logger.debug(`New tx for ${publicKey}: ${tx.hash}`);
          onTransaction(tx);
        },
        onerror: (err) => {
          this.logger.error(`Stream error for ${publicKey}`, err);
        },
      });

    return closeStream as () => void;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FEE CALCULATION
  // ─────────────────────────────────────────────────────────────────────────────

  async estimateFee(operationCount = 1): Promise<FeeEstimate> {
    const safeOperationCount = Math.max(1, operationCount);
    try {
      const feeStats = await this.getHorizonFeeStats('estimateFee');
      const chargedStats = feeStats.fee_charged as any;
      const baseFeeStroops = parseInt(chargedStats.mode, 10);
      const totalStroops = baseFeeStroops * safeOperationCount;

      const cheapStroops = parseInt(chargedStats.p20, 10);
      const fastStroops = parseInt(chargedStats.p90, 10);

      return {
        baseFee: this.stroopsToXlm(baseFeeStroops),
        estimatedTotalFee: this.stroopsToXlm(totalStroops),
        feePerOperation: this.stroopsToXlm(baseFeeStroops),
        currentNetworkFee: baseFeeStroops,
        cheapFeeSuggestion: {
          stroops: cheapStroops,
          xlm: this.stroopsToXlm(cheapStroops),
          percentile: 20,
        },
        fastFeeSuggestion: {
          stroops: fastStroops,
          xlm: this.stroopsToXlm(fastStroops),
          percentile: 90,
        },
      };
    } catch (err) {
      this.logger.warn('Could not fetch fee stats, using default 100 stroops');
      return {
        baseFee: this.stroopsToXlm(100),
        estimatedTotalFee: this.stroopsToXlm(100 * safeOperationCount),
        feePerOperation: this.stroopsToXlm(100),
        currentNetworkFee: 100,
        cheapFeeSuggestion: {
          stroops: 100,
          xlm: this.stroopsToXlm(100),
          percentile: 20,
        },
        fastFeeSuggestion: {
          stroops: 250,
          xlm: this.stroopsToXlm(250),
          percentile: 90,
        },
      };
    }
  }

  /**
   * Fetches current network fee stats and recommends a priority fee at the given percentile.
   */
  async getRecommendedPriorityFee(
    percentile: number = 90,
  ): Promise<PriorityFeeInfo> {
    try {
      const stats = await this.getHorizonFeeStats('getRecommendedPriorityFee');
      const pStats = stats.fee_charged as any;

      let recommendedStroops = parseInt(pStats.mode, 10);
      if (percentile <= 10) recommendedStroops = parseInt(pStats.p10, 10);
      else if (percentile <= 20) recommendedStroops = parseInt(pStats.p20, 10);
      else if (percentile <= 50) recommendedStroops = parseInt(pStats.p50, 10);
      else if (percentile <= 75) recommendedStroops = parseInt(pStats.p75, 10);
      else if (percentile <= 90) recommendedStroops = parseInt(pStats.p90, 10);
      else recommendedStroops = parseInt(pStats.p99, 10);

      // Add a 10% buffer to ensure it beats the exact percentile
      recommendedStroops = Math.ceil(recommendedStroops * 1.1);

      return {
        feePerOperationStroops: recommendedStroops,
        feePerOperationXlm: this.stroopsToXlm(recommendedStroops),
        percentile,
        networkStats: {
          p10: parseInt(pStats.p10, 10),
          p20: parseInt(pStats.p20, 10),
          p50: parseInt(pStats.p50, 10),
          p75: parseInt(pStats.p75, 10),
          p90: parseInt(pStats.p90, 10),
          p99: parseInt(pStats.p99, 10),
        },
      };
    } catch (err) {
      this.logger.warn(
        'Could not fetch detailed fee stats, falling back to mode + 500 stroops',
      );
      const base = await this.getBaseFee();
      const fallback = parseInt(base, 10) + 500;
      return {
        feePerOperationStroops: fallback,
        feePerOperationXlm: this.stroopsToXlm(fallback),
        percentile: 90,
        networkStats: {
          p10: 100,
          p20: 100,
          p50: 100,
          p75: 100,
          p90: 100,
          p99: 100,
        },
      };
    }
  }

  /**
   * Wraps a signed inner transaction in a fee-bump envelope.
   */
  async submitWithFeeBump(
    innerTxXdr: string,
    feeSourceSecret: string,
    maxFeeStroops: string,
  ): Promise<FeeBumpResult> {
    const feeSourceKeypair = StellarSdk.Keypair.fromSecret(feeSourceSecret);
    const innerTx = StellarSdk.TransactionBuilder.fromXDR(
      innerTxXdr,
      this.client.networkPassphrase,
    ) as StellarSdk.Transaction;

    const feeBumpTx = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
      feeSourceKeypair,
      maxFeeStroops,
      innerTx,
      this.client.networkPassphrase,
    );

    feeBumpTx.sign(feeSourceKeypair);

    try {
      const response = await this.submitWithRetry(
        feeBumpTx,
        'submitWithFeeBump',
      );
      this.logger.log(
        `Fee-bump transaction submitted | outerHash=${response.hash} innerHash=${innerTx.hash().toString('hex')}`,
      );

      return {
        feeBumpTransactionHash: response.hash,
        innerTransactionHash: innerTx.hash().toString('hex'),
        feeCharged: this.stroopsToXlm((response as any).fee_charged),
        ledger: response.ledger,
        createdAt: new Date(),
      };
    } catch (err) {
      this.handleStellarError(err, 'submitWithFeeBump');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  private async callHorizon<T>(
    context: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.client.call(context, operation);
  }

  private async loadHorizonAccount(
    publicKey: string,
    context: string,
  ): Promise<any> {
    return this.client.loadAccount(publicKey, context);
  }

  private async getHorizonFeeStats(context: string): Promise<any> {
    return this.client.feeStats(context);
  }

  private resolveAsset(
    assetCode?: string,
    assetIssuer?: string,
  ): StellarSdk.Asset {
    if (!assetCode || assetCode.toUpperCase() === 'XLM') {
      return StellarSdk.Asset.native();
    }
    if (!assetIssuer) {
      throw new BadRequestException(
        `assetIssuer is required for non-native asset "${assetCode}"`,
      );
    }
    return new StellarSdk.Asset(assetCode, assetIssuer);
  }

  private async getBaseFee(): Promise<string> {
    try {
      const stats = await this.getHorizonFeeStats('getBaseFee');
      const feeCharged = stats.fee_charged as Record<string, string>;
      const p90 = parseInt(feeCharged.p90, 10);
      const withBuffer = p90 + Math.ceil(p90 * 0.1);
      const maxFee = this.getPositiveIntegerConfig(
        'STELLAR_MAX_FEE_STROOPS',
        10_000,
      );
      const cappedByMax = withBuffer > maxFee;
      const selected = cappedByMax ? maxFee : withBuffer;

      if (cappedByMax) {
        throw new FeeCapExceededException(withBuffer, maxFee);
      }

      this.logger.log(
        `Fee selected | p90=${p90} stroops | buffered=${withBuffer} | cap=${maxFee} | selected=${selected} | capped=${cappedByMax}`,
      );

      return String(selected);
    } catch (err) {
      if (err instanceof FeeCapExceededException) {
        throw err;
      }
      console.error('Error in getBaseFee:', err);
      this.logger.warn('Could not fetch fee stats, using default 100 stroops');
      return '100';
    }
  }

  private extractBalanceId(
    response: StellarSdk.Horizon.HorizonApi.SubmitTransactionResponse,
  ): string {
    try {
      const result = StellarSdk.xdr.TransactionResult.fromXDR(
        response.result_xdr,
        'base64',
      );

      // If it's a fee-bump transaction, we need to dig into the inner result
      let results: StellarSdk.xdr.OperationResult[];
      if (
        result.result().switch().value ===
        StellarSdk.xdr.TransactionResultCode.txFeeBumpInnerSuccess().value
      ) {
        results = result.result().innerResultPair().result().result().results();
      } else {
        results = result.result().results();
      }

      const opResult = results[0];
      const createBalanceResult = opResult.tr().createClaimableBalanceResult();
      const balanceId = createBalanceResult.balanceId();
      return balanceId.toXDR('hex');
    } catch (err) {
      this.logger.error('Failed to extract balance ID from result XDR', err);
      throw new InternalServerErrorException(
        'Failed to extract escrow balance ID',
      );
    }
  }

  private stroopsToXlm(stroops: number | string): string {
    return (Number(stroops) / 10_000_000).toFixed(7);
  }

  /** Validates a Stellar public key (G-address, 56 chars). */
  private validatePublicKey(key: string): void {
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(key)) {
      throw new BadRequestException(`Invalid Stellar public key: ${key}`);
    }
  }

  private emitEscrowChanged(
    action: EscrowChangeAction,
    payload: {
      orderId: string;
      transactionHash?: string;
      balanceId?: string;
      amount?: string;
    },
  ): void {
    this.eventEmitter.emit(
      DomainEventNames.ESCROW_CHANGED,
      new EscrowChangedEvent(
        action,
        payload.orderId,
        payload.transactionHash,
        payload.balanceId,
        payload.amount,
      ),
    );
  }

  /** Validates that an amount is a positive numeric string. */
  private validateAmount(amount: string): void {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      throw new BadRequestException(`Invalid amount: ${amount}`);
    }
  }

  private handleStellarError(err: any, context: string): never {
    const status = err?.response?.status;

    if (err?.response?.data?.extras?.result_codes) {
      const resultCodes = err.response.data.extras.result_codes;
      this.structuredLogger?.errorEvent?.(
        'stellar_tx_failed',
        {
          context,
          status,
          resultCodes,
          message: err?.message ?? 'unknown',
        },
        StellarService.name,
      );
      this.logger.error(
        `Stellar error in ${context}`,
        JSON.stringify(resultCodes),
      );
      throw new BadRequestException(
        `Stellar transaction failed: ${JSON.stringify(resultCodes)}`,
      );
    }

    if (status === 404) {
      throw new BadRequestException(
        `Stellar resource not found (context: ${context})`,
      );
    }

    if (err instanceof BadRequestException) {
      throw err;
    }

    if (err instanceof ServiceUnavailableException) {
      throw err;
    }

    this.structuredLogger?.errorEvent?.(
      'stellar_tx_failed',
      {
        context,
        status,
        message: err?.message ?? 'unknown',
        kind: 'unexpected',
      },
      StellarService.name,
    );
    this.logger.error(`Unexpected Stellar error in ${context}`, err);
    throw new InternalServerErrorException(
      `Stellar network error in ${context}: ${err?.message ?? 'unknown'}`,
    );
  }

  /**
   * Submit a transaction with retry logic for better reliability.
   */
  private async submitWithRetry(
    transaction: StellarSdk.Transaction | StellarSdk.FeeBumpTransaction,
    context: string,
  ): Promise<StellarSdk.Horizon.HorizonApi.SubmitTransactionResponse> {
    return this.client.submitTransaction(transaction, context);
  }
}

