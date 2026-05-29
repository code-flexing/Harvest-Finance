import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Deposit, DepositStatus } from '../../database/entities/deposit.entity';
import { Vault } from '../../database/entities/vault.entity';
import {
  ChainAdapter,
  ChainYield,
} from '../interfaces/chain-adapter.interface';

/**
 * Stellar implementation of `ChainAdapter`. Reads confirmed vault deposits
 * from the application database — the ground-truth of what the user has
 * locked in Harvest's Stellar vaults — and reports each vault as a position.
 *
 * No on-chain calls are made here: aggregating principals across many
 * vaults via Horizon would be slow and redundant given we already index
 * deposits in Postgres.
 */
@Injectable()
export class StellarYieldAdapter implements ChainAdapter {
  readonly chain = 'stellar';

  constructor(
    @InjectRepository(Deposit)
    private readonly deposits: Repository<Deposit>,
    @InjectRepository(Vault)
    private readonly vaults: Repository<Vault>,
  ) {}

  async getYieldsForUser(userId: string): Promise<ChainYield[]> {
    try {
      const rows = await this.deposits
        .createQueryBuilder('deposit')
        .select('deposit.vaultId', 'vaultId')
        .addSelect('SUM(deposit.amount)', 'principal')
        .where('deposit.userId = :userId', { userId })
        .andWhere('deposit.status = :status', {
          status: DepositStatus.CONFIRMED,
        })
        .groupBy('deposit.vaultId')
        .getRawMany<{ vaultId: string; principal: string }>();

      if (rows.length === 0) return [];

      const vaultIds = rows.map((r) => r.vaultId);
      const vaults = await this.vaults.find({ where: { id: In(vaultIds) } });
      const vaultMap = new Map(vaults.map((v) => [v.id, v]));

      return rows.map((row): ChainYield => {
        const vault = vaultMap.get(row.vaultId);
        const principal = Number(row.principal) || 0;
        const apr =
          vault?.interestRate != null ? Number(vault.interestRate) : null;
        return {
          chain: this.chain,
          positionId: row.vaultId,
          positionName: vault?.vaultName ?? 'Unknown Vault',
          principal: principal.toFixed(7),
          asset: { code: 'XLM', issuer: null },
          apr,
          estimatedAnnualYield:
            apr != null ? ((principal * apr) / 100).toFixed(7) : null,
          metadata: {
            vaultType: vault?.type,
          },
        };
      });
    } catch (err) {
      // Degrade gracefully when upstream data is unavailable (network/db errors)
      return [];
    }
  }
}
