export interface EscrowCreateParams {
  farmerPublicKey: string;
  buyerPublicKey: string;
  amount: string;
  assetCode?: string;
  assetIssuer?: string;
  deadlineUnixTimestamp: number;
  orderId: string;
  /** Optional: override base fee with a priority fee (in stroops) for fee-bump protection */
  priorityFeeStroops?: string;
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
  /** Present when the tx was submitted as a fee-bump envelope */
  feeBumpTransactionHash?: string;
}

export interface ReleasePaymentParams {
  balanceId: string;
  farmerPublicKey: string;
  farmerSecretKey: string;
  /** Optional: override base fee with a priority fee (in stroops) for fee-bump protection */
  priorityFeeStroops?: string;
}

export interface ReleaseUpfrontPaymentParams {
  orderId: string;
  farmerPublicKey: string;
  amount: string;
  assetCode?: string;
  assetIssuer?: string;
  /** Optional: override base fee with a priority fee (in stroops) for fee-bump protection */
  priorityFeeStroops?: string;
}

export interface RefundParams {
  balanceId: string;
  buyerPublicKey: string;
  buyerSecretKey: string;
  /** Optional: override base fee with a priority fee (in stroops) for fee-bump protection */
  priorityFeeStroops?: string;
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

export interface DecodedOperation {
  type: string;
  details: Record<string, any>;
}

export interface DecodedTransaction {
  hash: string;
  ledger: number;
  createdAt: string;
  sourceAccount: string;
  successful: boolean;
  memo: string | null;
  operations: DecodedOperation[];
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
  cheapFeeSuggestion: {
    stroops: number;
    xlm: string;
    percentile: number;
  };
  fastFeeSuggestion: {
    stroops: number;
    xlm: string;
    percentile: number;
  };
}

export interface AccountInfo {
  publicKey: string;
  balance: string;
  sequence: string;
  signers: { key: string; weight: number }[];
  thresholds: { low: number; med: number; high: number };
}

export interface StellarBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FEE-BUMP / MEV INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Categorises the type of fee-bump MEV attack scenario being simulated.
 *
 * FRONT_RUN     – attacker bumps their tx to land *before* a victim's pending tx
 * BACK_RUN      – attacker bumps their tx to land *after* (e.g. to exploit state change)
 * CENSORSHIP    – legitimate tx stuck at base fee while attacker's bumped tx sails through
 * DOUBLE_CLAIM  – two parties race to claim the same claimable balance; highest fee wins
 */
export enum FeeBumpScenario {
  FRONT_RUN = 'FRONT_RUN',
  BACK_RUN = 'BACK_RUN',
  CENSORSHIP = 'CENSORSHIP',
  DOUBLE_CLAIM = 'DOUBLE_CLAIM',
}

/**
 * Parameters for wrapping a signed inner transaction in a fee-bump envelope.
 *
 * The fee source account pays the higher fee; the inner source account's sequence
 * number is still consumed. This mirrors the Stellar fee-bump transaction spec
 * (CAP-0015).
 */
export interface FeeBumpParams {
  /** XDR-encoded (base64) signed inner transaction */
  innerTransactionXdr: string;
  /** Secret key of the account that will pay the bumped fee */
  feeSourceSecretKey: string;
  /**
   * Maximum total fee (in stroops) the fee-source account is willing to pay
   * for the entire fee-bump envelope. Must be ≥ (min_base_fee_per_op * ops)
   * and strictly greater than the inner tx's declared fee.
   */
  maxFeeStroops: string;
}

/**
 * Result returned after submitting a fee-bump transaction.
 */
export interface FeeBumpResult {
  /** Hash of the outer fee-bump envelope transaction */
  feeBumpTransactionHash: string;
  /** Hash of the inner transaction carried inside the envelope */
  innerTransactionHash: string;
  /** Fee actually charged on the outer envelope (in XLM) */
  feeCharged: string;
  /** Ledger the transaction closed in */
  ledger: number;
  /** ISO timestamp of ledger close */
  createdAt: Date;
}

/**
 * Priority fee information for a specific network percentile.
 * Used to decide how aggressively to fee-bump rebalancing calls.
 */
export interface PriorityFeeInfo {
  /** Recommended fee per operation at the requested percentile (in stroops) */
  feePerOperationStroops: number;
  /** Human-readable XLM equivalent */
  feePerOperationXlm: string;
  /** The percentile this info corresponds to (e.g. 50, 75, 90, 99) */
  percentile: number;
  /** Raw fee stats snapshot from the network */
  networkStats: {
    p10: number;
    p20: number;
    p50: number;
    p75: number;
    p90: number;
    p99: number;
  };
}

/**
 * Describes a sensitive strategy rebalancing call that can optionally be
 * protected with a fee-bump envelope.
 */
export interface RebalancingCallParams {
  /** Which rebalancing operation to perform */
  operation:
    | 'createEscrow'
    | 'releasePayment'
    | 'refundEscrow'
    | 'releaseUpfrontPayment';
  /** If set, the call will be wrapped in a fee-bump at this fee level (stroops) */
  priorityFeeStroops?: string;
  /** Secret key of the fee-bump fee-source account (defaults to platform key if absent) */
  feeSourceSecretKey?: string;
  /** The MEV scenario this call is part of (for logging / testing purposes) */
  scenario?: FeeBumpScenario;
}
