import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Vault } from '../../database/entities/vault.entity';
import { Deposit } from '../../database/entities/deposit.entity';
import { Withdrawal } from '../../database/entities/withdrawal.entity';

@Injectable()
export class VaultReadRepository {
  constructor(private readonly dataSource: DataSource) {}

  async getBalance(vaultId: string, userId?: string) {
    if (userId) {
      const result = await this.dataSource
        .getRepository(Deposit)
        .createQueryBuilder('d')
        .select('SUM(d.amount)', 'total')
        .where('d.vaultId = :vaultId', { vaultId })
        .andWhere('d.userId = :userId', { userId })
        .andWhere('d.status = :status', { status: 'CONFIRMED' })
        .getRawOne();

      return result?.total ? parseFloat(result.total) : 0;
    }

    const vault = await this.dataSource.getRepository(Vault).findOne({ where: { id: vaultId } });
    return vault ? Number(vault.totalDeposits) : 0;
  }

  async getTransactions(vaultId: string, limit = 50) {
    const deposits = await this.dataSource
      .getRepository(Deposit)
      .find({ where: { vaultId }, order: { createdAt: 'DESC' }, take: limit });

    const withdrawals = await this.dataSource
      .getRepository(Withdrawal)
      .find({ where: { vaultId }, order: { createdAt: 'DESC' }, take: limit });

    const combined = [...deposits, ...withdrawals];
    combined.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
    return combined.slice(0, limit);
  }

  async incrementBalance(vaultId: string, amount: number) {
    await this.dataSource.getRepository(Vault).increment({ id: vaultId } as any, 'totalDeposits', amount);
  }

  async decrementBalance(vaultId: string, amount: number) {
    await this.dataSource.getRepository(Vault).decrement({ id: vaultId } as any, 'totalDeposits', amount);
  }
}
