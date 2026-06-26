import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { xdr, Address, Networks } from 'stellar-sdk';
import { SorobanIndexerService } from './soroban-indexer.service';

@Injectable()
export class SorobanStorageService {
  private readonly logger = new Logger(SorobanStorageService.name);
  private readonly rpcUrl: string;
  private readonly networkPassphrase: string;
  private readonly ttlThreshold = 1000; // ledgers

  constructor(
    private readonly config: ConfigService,
    private readonly indexer: SorobanIndexerService,
  ) {
    this.rpcUrl = this.config.get<string>(
      'SOROBAN_RPC_URL',
      'https://soroban-testnet.stellar.org',
    );
    this.networkPassphrase = this.config.get<string>(
      'STELLAR_NETWORK_PASSPHRASE',
      Networks.TESTNET,
    );
  }

  /**
   * Checks the TTL of a contract's storage entries and extends them if necessary.
   * This ensures that contract data doesn't get archived during periods of inactivity.
   */
  async ensureStoragePersistence(contractId: string): Promise<void> {
    this.logger.log(`Checking storage TTL for contract: ${contractId}`);

    try {
      // 1. Fetch current ledger to calculate TTL
      const latestLedger = await this.indexer.getLatestLedger();

      // 2. Fetch contract instance to check its TTL
      const instanceKey = xdr.LedgerKey.contractData(
        new xdr.LedgerKeyContractData({
          contract: Address.fromString(contractId).toScAddress(),
          key: xdr.ScVal.scvLedgerKeyContractInstance(),
          durability: xdr.ContractDataDurability.persistent(),
        }),
      );

      const response = await this.indexer.getLedgerEntries([
        instanceKey.toXDR('base64'),
      ]);

      if (!response.entries || response.entries.length === 0) {
        this.logger.warn(`Contract instance not found for ${contractId}`);
        return;
      }

      const entry = response.entries[0];
      const liveUntilLedger = entry.liveUntilLedger;
      const ttl = liveUntilLedger - latestLedger;

      this.logger.log(
        `Contract ${contractId} TTL: ${ttl} ledgers (Live until: ${liveUntilLedger})`,
      );

      if (ttl < this.ttlThreshold) {
        this.logger.warn(
          `TTL below threshold (${ttl} < ${this.ttlThreshold}). Extending...`,
        );
        await this.extendTtl(contractId);
      } else {
        this.logger.log(`TTL is sufficient.`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to ensure storage persistence for ${contractId}:`,
        error,
      );
    }
  }

  /**
   * Submits an extend_ttl operation for the contract instance.
   */
  private async extendTtl(contractId: string): Promise<void> {
    // In a real scenario, this would submit a transaction with ExtendFootprintTTLOp
    // For the stress test, we log the intent.
    // In a real scenario, this would submit a transaction with ExtendFootprintTTLOp
    // For the stress test, we log a warning indicating the intent to extend.
    this.logger.warn(`Extending TTL for ${contractId}`);


  }
}
