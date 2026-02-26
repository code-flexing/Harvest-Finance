import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from 'stellar-sdk';
import {
    EscrowCreateParams,
    EscrowResult,
    ReleasePaymentParams,
    RefundParams,
    TransactionStatus,
    MultiSigSetupParams,
    FeeEstimate,
    AccountInfo,
} from '../interfaces/stellar.interfaces';

@Injectable()
export class StellarService {
    private readonly logger = new Logger(StellarService.name);
    private readonly server: StellarSdk.Horizon.Server;
    private readonly networkPassphrase: string;
    private readonly platformPublicKey: string;
    private readonly platformSecretKey: string;

    constructor(private readonly configService: ConfigService) {
        const network = this.configService.get<string>('STELLAR_NETWORK', 'testnet');

        if (network === 'mainnet') {
        this.server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
        this.networkPassphrase = StellarSdk.Networks.PUBLIC;
        this.logger.warn('⚠️  Running on Stellar MAINNET');
        } else {
        this.server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
        this.networkPassphrase = StellarSdk.Networks.TESTNET;
        this.logger.log('✅ Running on Stellar TESTNET');
        }

        this.platformPublicKey = this.configService.getOrThrow<string>('STELLAR_PLATFORM_PUBLIC_KEY');
        this.platformSecretKey = this.configService.getOrThrow<string>('STELLAR_PLATFORM_SECRET_KEY');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ACCOUNT MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────────

    async getAccountInfo(publicKey: string): Promise<AccountInfo> {
        this.validatePublicKey(publicKey);
        try {
        const account = await this.server.loadAccount(publicKey);
        const xlmBalance = account.balances.find((b) => b.asset_type === 'native');

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

    async verifyConnection(): Promise<boolean> {
        try {
        await this.server.loadAccount(this.platformPublicKey);
        this.logger.log(`Stellar connection OK — platform account: ${this.platformPublicKey}`);
        return true;
        } catch (err) {
        this.logger.error('Stellar connection FAILED', err);
        return false;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ESCROW — CLAIMABLE BALANCES
    // ─────────────────────────────────────────────────────────────────────────────


    async createEscrow(params: EscrowCreateParams): Promise<EscrowResult> {
        const { farmerPublicKey, buyerPublicKey, amount, assetCode, assetIssuer, deadlineUnixTimestamp, orderId } = params;

        this.logger.log(`Creating escrow | order=${orderId} amount=${amount} asset=${assetCode ?? 'XLM'}`);

        this.validatePublicKey(farmerPublicKey);
        this.validatePublicKey(buyerPublicKey);
        this.validateAmount(amount);

        if (deadlineUnixTimestamp <= Math.floor(Date.now() / 1000)) {
        throw new BadRequestException('Escrow deadline must be in the future');
        }

        const asset = this.resolveAsset(assetCode, assetIssuer);
        const platformAccount = await this.server.loadAccount(this.platformPublicKey);

        // Predicate: farmer can claim unconditionally
        const farmerPredicate = StellarSdk.Claimant.predicateUnconditional();

        // Predicate: buyer can only reclaim after the deadline
        const buyerPredicate = StellarSdk.Claimant.predicateNot(
        StellarSdk.Claimant.predicateBeforeAbsoluteTime(deadlineUnixTimestamp.toString()),
        );

        const claimants = [
        new StellarSdk.Claimant(farmerPublicKey, farmerPredicate),
        new StellarSdk.Claimant(buyerPublicKey, buyerPredicate),
        ];

        const transaction = new StellarSdk.TransactionBuilder(platformAccount, {
        fee: await this.getBaseFee(),
        networkPassphrase: this.networkPassphrase,
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

        const platformKeypair = StellarSdk.Keypair.fromSecret(this.platformSecretKey);
        transaction.sign(platformKeypair);

        try {
        const response = await this.server.submitTransaction(transaction);
        const balanceId = this.extractBalanceId(response);

        this.logger.log(`Escrow created | balanceId=${balanceId} txHash=${response.hash}`);

        return {
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
        } catch (err) {
        this.handleStellarError(err, 'createEscrow');
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PAYMENT RELEASE
    // ─────────────────────────────────────────────────────────────────────────────

    async releasePayment(params: ReleasePaymentParams): Promise<TransactionStatus> {
        const { balanceId, farmerPublicKey, farmerSecretKey } = params;

        this.logger.log(`Releasing payment | balanceId=${balanceId} farmer=${farmerPublicKey}`);

        const farmerKeypair = StellarSdk.Keypair.fromSecret(farmerSecretKey);
        if (farmerKeypair.publicKey() !== farmerPublicKey) {
        throw new BadRequestException('farmerSecretKey does not match farmerPublicKey');
        }

        const farmerAccount = await this.server.loadAccount(farmerPublicKey);

        const transaction = new StellarSdk.TransactionBuilder(farmerAccount, {
        fee: await this.getBaseFee(),
        networkPassphrase: this.networkPassphrase,
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

        try {
        const response = await this.server.submitTransaction(transaction);
        this.logger.log(`Payment released | txHash=${response.hash}`);

        return {
            transactionHash: response.hash,
            status: 'success',
            ledger: response.ledger,
            createdAt: new Date(),
            fee: "0",
        };
        } catch (err) {
        this.handleStellarError(err, 'releasePayment');
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // REFUND
    // ─────────────────────────────────────────────────────────────────────────────

    async refundEscrow(params: RefundParams): Promise<TransactionStatus> {
        const { balanceId, buyerPublicKey, buyerSecretKey } = params;

        this.logger.log(`Processing refund | balanceId=${balanceId} buyer=${buyerPublicKey}`);

        const buyerKeypair = StellarSdk.Keypair.fromSecret(buyerSecretKey);
        if (buyerKeypair.publicKey() !== buyerPublicKey) {
        throw new BadRequestException('buyerSecretKey does not match buyerPublicKey');
        }

        const buyerAccount = await this.server.loadAccount(buyerPublicKey);

        const transaction = new StellarSdk.TransactionBuilder(buyerAccount, {
        fee: await this.getBaseFee(),
        networkPassphrase: this.networkPassphrase,
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

        try {
        const response = await this.server.submitTransaction(transaction);
        this.logger.log(`Refund processed | txHash=${response.hash}`);

        return {
            transactionHash: response.hash,
            status: 'success',
            ledger: response.ledger,
            createdAt: new Date(),
            fee: "0",
        };
        } catch (err) {
        this.handleStellarError(err, 'refundEscrow');
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MULTI-SIGNATURE ACCOUNT SETUP
    // ─────────────────────────────────────────────────────────────────────────────

    async setupMultiSigAccount(params: MultiSigSetupParams): Promise<TransactionStatus> {
        const { primaryPublicKey, cosignerPublicKeys, threshold, sourceSecretKey } = params;

        this.logger.log(`Setting up multisig | account=${primaryPublicKey} threshold=${threshold}/${cosignerPublicKeys.length + 1}`);

        if (threshold > cosignerPublicKeys.length + 1) {
        throw new BadRequestException('Threshold cannot exceed total number of signers');
        }

        for (const key of cosignerPublicKeys) {
        this.validatePublicKey(key);
        }

        const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecretKey);
        const sourceAccount = await this.server.loadAccount(sourceKeypair.publicKey());

        const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: await this.getBaseFee(),
        networkPassphrase: this.networkPassphrase,
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
        const response = await this.server.submitTransaction(transaction);
        this.logger.log(`Multisig configured | txHash=${response.hash}`);

        return {
            transactionHash: response.hash,
            status: 'success',
            ledger: response.ledger,
            createdAt: new Date(),
            fee: "0",
        };
        } catch (err) {
        this.handleStellarError(err, 'setupMultiSigAccount');
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TRANSACTION MONITORING
    // ─────────────────────────────────────────────────────────────────────────────

    async getTransactionStatus(transactionHash: string): Promise<TransactionStatus> {
        try {
        const tx = await this.server.transactions().transaction(transactionHash).call();
        const ops = await this.server.operations().forTransaction(transactionHash).call();

        const operations = ops.records.map((op: any) => ({
            type: op.type,
            from: op.from,
            to: op.to,
            amount: op.amount,
            asset: op.asset_type === 'native' ? 'XLM' : `${op.asset_code}:${op.asset_issuer}`,
        }));

        return {
            transactionHash,
            status: tx.successful ? 'success' : 'failed',
            ledger: Number(tx.ledger),
            createdAt: new Date(tx.created_at),
            fee: this.stroopsToXlm(String(tx.fee_charged)),
            operations,
        };
        } catch (err) {
        this.handleStellarError(err, 'getTransactionStatus');
        }
    }

    async getClaimableBalances(publicKey: string): Promise<any[]> {
        this.validatePublicKey(publicKey);
        try {
        const response = await this.server
            .claimableBalances()
            .claimant(publicKey)
            .call();
        return response.records;
        } catch (err) {
        this.handleStellarError(err, 'getClaimableBalances');
        }
    }

    monitorAccount(publicKey: string, onTransaction: (tx: any) => void): () => void {
        this.validatePublicKey(publicKey);

        this.logger.log(`Starting transaction stream for account: ${publicKey}`);

        const closeStream = this.server
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
        try {
        const feeStats = await this.server.feeStats();
        const baseFeeStroops = parseInt(feeStats.fee_charged.mode, 10);
        const totalStroops = baseFeeStroops * operationCount;

        return {
            baseFee: this.stroopsToXlm(baseFeeStroops),
            estimatedTotalFee: this.stroopsToXlm(totalStroops),
            feePerOperation: this.stroopsToXlm(baseFeeStroops),
            currentNetworkFee: baseFeeStroops,
        };
        } catch (err) {
        this.logger.warn('Could not fetch fee stats, using default 100 stroops');
        return {
            baseFee: this.stroopsToXlm(100),
            estimatedTotalFee: this.stroopsToXlm(100 * operationCount),
            feePerOperation: this.stroopsToXlm(100),
            currentNetworkFee: 100,
        };
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────────

    private resolveAsset(assetCode?: string, assetIssuer?: string): StellarSdk.Asset {
        if (!assetCode || assetCode.toUpperCase() === 'XLM') {
        return StellarSdk.Asset.native();
        }
        if (!assetIssuer) {
        throw new BadRequestException(`assetIssuer is required for non-native asset "${assetCode}"`);
        }
        return new StellarSdk.Asset(assetCode, assetIssuer);
    }

    private async getBaseFee(): Promise<string> {
        try {
        const stats = await this.server.feeStats();
        return stats.fee_charged.mode;
        } catch {
        return '100';
        }
    }


    private extractBalanceId(response: StellarSdk.Horizon.HorizonApi.SubmitTransactionResponse): string {
        try {
        const result = StellarSdk.xdr.TransactionResult.fromXDR(response.result_xdr, 'base64');
        const opResult = result.result().results()[0];
        const createBalanceResult = opResult.tr().createClaimableBalanceResult();
        const balanceId = createBalanceResult.balanceId();
        return balanceId.toXDR('hex');
        } catch (err) {
        this.logger.error('Failed to extract balance ID from result XDR', err);
        throw new InternalServerErrorException('Failed to extract escrow balance ID');
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

    /** Validates that an amount is a positive numeric string. */
    private validateAmount(amount: string): void {
        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed <= 0) {
        throw new BadRequestException(`Invalid amount: ${amount}`);
        }
    }


    private handleStellarError(err: any, context: string): never {
        if (err?.response?.data?.extras?.result_codes) {
        const codes = err.response.data.extras.result_codes;
        this.logger.error(`Stellar error in ${context}`, JSON.stringify(codes));
        throw new BadRequestException(`Stellar transaction failed: ${JSON.stringify(codes)}`);
        }

        if (err?.response?.status === 404) {
        throw new BadRequestException(`Stellar resource not found (context: ${context})`);
        }

        if (err instanceof BadRequestException) {
        throw err;
        }

        this.logger.error(`Unexpected Stellar error in ${context}`, err);
        throw new InternalServerErrorException(`Stellar network error in ${context}: ${err?.message ?? 'unknown'}`);
    }
}