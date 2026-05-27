import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Vault } from '../database/entities/vault.entity';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';

export interface SyncResult {
  vaultId: string;
  dbTotalAssets: number;
  onChainTotalAssets: number;
  drift: number;
  synced: boolean;
}

@Injectable()
export class StateSyncService {
  private readonly logger = new Logger(StateSyncService.name);
  private readonly contractAddress: string;
  private readonly rpcUrl: string;
  private lastSyncAt: Date | null = null;
  private lastResults: SyncResult[] = [];

  constructor(
    @InjectRepository(Vault) private readonly vaultRepo: Repository<Vault>,
    @InjectRepository(Deposit)
    private readonly depositRepo: Repository<Deposit>,
    private readonly config: ConfigService,
  ) {
    this.contractAddress = this.config.get<string>(
      'VAULT_CONTRACT_ADDRESS',
      '',
    );
    this.rpcUrl = this.config.get<string>(
      'SOROBAN_RPC_URL',
      'https://soroban-testnet.stellar.org',
    );
  }

  /**
   * Runs every 5 minutes. Compares each vault's DB totalDeposits
   * against the sum of confirmed deposits (as a proxy for on-chain state
   * until a live Soroban read is wired in).
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncAll(): Promise<void> {
    this.logger.log('State sync worker started');
    try {
      this.lastResults = await this.runSync();
      const drifted = this.lastResults.filter((r) => !r.synced);
      if (drifted.length > 0) {
        this.logger.warn(
          `State drift detected in ${drifted.length} vault(s): ${drifted.map((r) => r.vaultId).join(', ')}`,
        );
      } else {
        this.logger.log(`All ${this.lastResults.length} vault(s) in sync`);
      }
    } catch (err) {
      this.logger.error(
        `State sync failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    } finally {
      this.lastSyncAt = new Date();
    }
  }

  /**
   * Core reconciliation logic. Exposed for manual triggers and tests.
   * Compares vault.totalDeposits (DB) against the sum of CONFIRMED deposits
   * for that vault (source of truth until on-chain reads are available).
   */
  async runSync(): Promise<SyncResult[]> {
    const vaults = await this.vaultRepo.find();
    const results: SyncResult[] = [];

    for (const vault of vaults) {
      const row = await this.depositRepo
        .createQueryBuilder('d')
        .select('COALESCE(SUM(d.amount), 0)', 'total')
        .where('d.vaultId = :id', { id: vault.id })
        .andWhere('d.status = :s', { s: DepositStatus.CONFIRMED })
        .getRawOne<{ total: string }>();

      const onChainTotalAssets = parseFloat(row?.total ?? '0');
      const dbTotalAssets = Number(vault.totalDeposits);
      const drift = Math.abs(dbTotalAssets - onChainTotalAssets);
      const synced = drift < 0.000001; // tolerance for floating-point

      if (!synced) {
        this.logger.warn(
          `Vault ${vault.id} (${vault.vaultName}): DB=${dbTotalAssets} on-chain=${onChainTotalAssets} drift=${drift}`,
        );
        // Auto-correct DB to match confirmed deposit sum
        await this.vaultRepo.update(vault.id, {
          totalDeposits: onChainTotalAssets,
        });
        this.logger.log(`Vault ${vault.id} corrected to ${onChainTotalAssets}`);
      }

      results.push({
        vaultId: vault.id,
        dbTotalAssets,
        onChainTotalAssets,
        drift,
        synced,
      });
    }

    return results;
  }

  status() {
    return {
      lastSyncAt: this.lastSyncAt?.toISOString() ?? null,
      vaultsSynced: this.lastResults.length,
      driftedVaults: this.lastResults.filter((r) => !r.synced).length,
      results: this.lastResults,
    };
  }
}
