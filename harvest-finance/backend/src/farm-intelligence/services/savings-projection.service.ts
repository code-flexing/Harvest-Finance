import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { addMonths, format } from 'date-fns';
import { Vault } from '../../database/entities/vault.entity';
import { Deposit, DepositStatus } from '../../database/entities/deposit.entity';
import {
  MonthlyProjection,
  SavingsProjectionResult,
} from '../dto/intelligence.dto';

@Injectable()
export class SavingsProjectionService {
  constructor(
    @InjectRepository(Vault) private vaultRepo: Repository<Vault>,
    @InjectRepository(Deposit) private depositRepo: Repository<Deposit>,
  ) {}

  async projectSavings(
    userId: string,
    monthsAhead: number,
  ): Promise<SavingsProjectionResult> {
    const months = Math.min(Math.max(monthsAhead, 1), 24);
    const deposits = await this.depositRepo.find({
      where: { userId, status: DepositStatus.CONFIRMED },
      relations: ['vault'],
    });
    const currentBalance = deposits.reduce(
      (sum, d) => sum + Number(d.amount),
      0,
    );
    let weightedRate = 0;
    if (currentBalance > 0) {
      for (const deposit of deposits) {
        const rate = deposit.vault ? Number(deposit.vault.interestRate) : 0;
        weightedRate += (Number(deposit.amount) / currentBalance) * rate;
      }
    }
    const projections: MonthlyProjection[] = [];
    let runningBalance = currentBalance;
    const monthlyRate = weightedRate / 12;
    const now = new Date();
    for (let i = 1; i <= months; i++) {
      runningBalance += runningBalance * monthlyRate;
      projections.push({
        month: i,
        label: format(addMonths(now, i), 'MMM yyyy'),
        projectedBalance: parseFloat(runningBalance.toFixed(2)),
        cumulativeInterest: parseFloat(
          (runningBalance - currentBalance).toFixed(2),
        ),
      });
    }
    return {
      currentBalance: parseFloat(currentBalance.toFixed(2)),
      projections,
      totalProjectedGrowth:
        projections.length > 0
          ? projections[projections.length - 1].cumulativeInterest
          : 0,
    };
  }
}
