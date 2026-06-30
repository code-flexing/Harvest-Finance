/**
 * ChainAdapter interface for abstracting blockchain operations.
 * This interface decouples vault business logic from specific blockchain implementations,
 * allowing multiple chains (Stellar, EVM, Cosmos) to be supported without touching core logic.
 */
export interface ChainAdapter {
  /**
   * Submits a transaction to the blockchain.
   * @param transactionData - The transaction data to submit (format depends on chain implementation)
   * @returns Transaction hash and status
   */
  submitTransaction(transactionData: any): Promise<{
    transactionHash: string;
    status: 'pending' | 'success' | 'failed';
    ledger?: number;
    createdAt?: Date;
    fee?: string;
  }>;

  /**
   * Gets the balance for a given address.
   * @param address - The blockchain address to query
   * @returns Balance information
   */
  getBalance(address: string): Promise<{
    balance: string;
    assetCode?: string;
    assetIssuer?: string;
  }>;

  /**
   * Streams blockchain events for a given address.
   * @param address - The blockchain address to monitor
   * @param onEvent - Callback function invoked when an event occurs
   * @returns Cleanup function to stop the stream
   */
  streamEvents(
    address: string,
    onEvent: (event: any) => void,
  ): () => void;

  /**
   * Estimates the fee for a transaction.
   * @param operationCount - Number of operations in the transaction (default: 1)
   * @returns Fee estimate with base fee and total estimated fee
   */
  estimateFee(operationCount?: number): Promise<{
    baseFee: string;
    estimatedTotalFee: string;
    feePerOperation: string;
    currentNetworkFee: number;
  }>;

  /**
   * Gets the chain identifier for this adapter.
   * @returns The chain ID (e.g., 'stellar', 'evm', 'cosmos')
   */
  getChainId(): string;
}
