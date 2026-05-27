import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as StellarSdk from 'stellar-sdk';
import { StellarService } from '../stellar/services/stellar.service';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';
import { Vault } from '../database/entities/vault.entity';
import { User } from '../database/entities/user.entity';
import {
  AssetBalanceDto,
  PortfolioResponseDto,
  StellarAccountSnapshotDto,
  VaultHoldingDto,
} from './dto/portfolio.dto';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    private readonly stellarService: StellarService,
    @InjectRepository(Deposit)
    private readonly depositRepository: Repository<Deposit>,
    @InjectRepository(Vault)
    private readonly vaultRepository: Repository<Vault>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async buildPortfolio(
    userId: string,
    stellarAddresses: string[],
  ): Promise<PortfolioResponseDto> {
    const uniqueAddresses = Array.from(
      new Set((stellarAddresses ?? []).filter(Boolean)),
    );

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (
      user?.stellarAddress &&
      !uniqueAddresses.includes(user.stellarAddress)
    ) {
      uniqueAddresses.push(user.stellarAddress);
    }

    const accountSnapshots = await Promise.all(
      uniqueAddresses.map((addr) => this.snapshotAccount(addr)),
    );

    const aggregatedStellarBalances = this.aggregate(accountSnapshots);

    const { vaults, totalVaultBalance } = await this.getVaultHoldings(userId);

    return {
      userId,
      generatedAt: new Date().toISOString(),
      accounts: accountSnapshots,
      aggregatedStellarBalances,
      vaults,
      totalVaultBalance,
    };
  }

  private async snapshotAccount(
    publicKey: string,
  ): Promise<StellarAccountSnapshotDto> {
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
      return {
        publicKey,
        exists: false,
        balances: [],
        error: 'Invalid Stellar public key',
      };
    }

    try {
      const balances = await this.stellarService.getAccountBalances(publicKey);
      return { publicKey, exists: true, balances };
    } catch (err: any) {
      this.logger.warn(
        `Failed to load Stellar account ${publicKey}: ${err?.message ?? 'unknown'}`,
      );
      return {
        publicKey,
        exists: false,
        balances: [],
        error:
          err?.response?.status === 404
            ? 'Account not found'
            : 'Account load failed',
      };
    }
  }

  private aggregate(accounts: StellarAccountSnapshotDto[]): AssetBalanceDto[] {
    const totals = new Map<string, AssetBalanceDto>();

    for (const account of accounts) {
      for (const bal of account.balances) {
        const key = `${bal.assetCode}:${bal.assetIssuer ?? ''}`;
        const existing = totals.get(key);
        const current = Number(bal.balance) || 0;
        if (existing) {
          existing.balance = (Number(existing.balance) + current).toFixed(7);
        } else {
          totals.set(key, {
            assetCode: bal.assetCode,
            assetIssuer: bal.assetIssuer,
            balance: current.toFixed(7),
          });
        }
      }
    }

    return Array.from(totals.values());
  }

  private async getVaultHoldings(
    userId: string,
  ): Promise<{ vaults: VaultHoldingDto[]; totalVaultBalance: number }> {
    const rows = await this.depositRepository
      .createQueryBuilder('deposit')
      .select('deposit.vaultId', 'vaultId')
      .addSelect('SUM(deposit.amount)', 'balance')
      .where('deposit.userId = :userId', { userId })
      .andWhere('deposit.status = :status', { status: DepositStatus.CONFIRMED })
      .groupBy('deposit.vaultId')
      .getRawMany<{ vaultId: string; balance: string }>();

    if (rows.length === 0) {
      return { vaults: [], totalVaultBalance: 0 };
    }

    const vaultIds = rows.map((r) => r.vaultId);
    const vaults = await this.vaultRepository.find({
      where: { id: In(vaultIds) },
    });
    const vaultMap = new Map(vaults.map((v) => [v.id, v]));

    let total = 0;
    const vaultHoldings: VaultHoldingDto[] = rows.map((row) => {
      const vault = vaultMap.get(row.vaultId);
      const balance = parseFloat(row.balance) || 0;
      total += balance;
      return {
        vaultId: row.vaultId,
        vaultName: vault?.vaultName ?? 'Unknown Vault',
        vaultType: vault?.type ?? 'UNKNOWN',
        balance,
      };
    });

    return { vaults: vaultHoldings, totalVaultBalance: total };
  }
}
