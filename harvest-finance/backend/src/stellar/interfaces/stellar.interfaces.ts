export interface EscrowCreateParams {
    farmerPublicKey: string;
    buyerPublicKey: string;
    amount: string;
    assetCode?: string;
    assetIssuer?: string;
    deadlineUnixTimestamp: number;
    orderId: string;
}

export interface EscrowResult {
    balanceId: string;
    transactionHash: string;
    createdAt: Date;
    expiresAt: Date;
    amount: string;
    assetCode: string;
    farmerPublicKey: string;
    buyerPublicKey: string;
    orderId: string;
}


export interface ReleasePaymentParams {
    balanceId: string;
    farmerPublicKey: string;
    farmerSecretKey: string;
}

export interface ReleaseUpfrontPaymentParams {
    orderId: string;
    farmerPublicKey: string;
    amount: string;
    assetCode?: string;
    assetIssuer?: string;
}

export interface RefundParams {
    balanceId: string;
    buyerPublicKey: string;
    buyerSecretKey: string;
}

export interface TransactionStatus {
    transactionHash: string;
    status: 'pending' | 'success' | 'failed';
    ledger?: number;
    createdAt?: Date;
    fee?: string;
    operations?: OperationRecord[];
}

export interface OperationRecord {
    type: string;
    from?: string;
    to?: string;
    amount?: string;
    asset?: string;
}

export interface MultiSigSetupParams {
    primaryPublicKey: string;
    cosignerPublicKeys: string[];
    threshold: number;
    sourceSecretKey: string;
}

export interface FeeEstimate {
    baseFee: string;
    estimatedTotalFee: string;
    feePerOperation: string;
    currentNetworkFee: number;
}

export interface AccountInfo {
    publicKey: string;
    balance: string;
    sequence: string;
    signers: { key: string; weight: number }[];
    thresholds: { low: number; med: number; high: number };
}