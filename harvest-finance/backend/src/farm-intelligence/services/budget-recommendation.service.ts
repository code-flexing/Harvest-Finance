import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deposit, DepositStatus } from '../../database/entities/deposit.entity';
import { BudgetCategory, BudgetRecommendation } from '../dto/intelligence.dto';

type Tier = 'low' | 'medium' | 'high';

const ALLOCATIONS: Record<
  Tier,
  { seeds: number; fertilizer: number; labor: number; savings: number }
> = {
  low: { seeds: 0.3, fertilizer: 0.2, labor: 0.25, savings: 0.25 },
  medium: { seeds: 0.25, fertilizer: 0.2, labor: 0.2, savings: 0.35 },
  high: { seeds: 0.2, fertilizer: 0.15, labor: 0.15, savings: 0.5 },
};

@Injectable()
export class BudgetRecommendationService {
  constructor(
    @InjectRepository(Deposit) private depositRepo: Repository<Deposit>,
  ) {}

  async getRecommendation(userId: string): Promise<BudgetRecommendation> {
    const result = await this.depositRepo
      .createQueryBuilder('deposit')
      .select('SUM(deposit.amount)', 'total')
      .where('deposit.userId = :userId', { userId })
      .andWhere('deposit.status = :status', { status: DepositStatus.CONFIRMED })
      .getRawOne<{ total: string | null }>();

    const totalBalance = result?.total ? parseFloat(result.total) : 0;
    let tier: Tier = 'low';
    if (totalBalance >= 10000) tier = 'high';
    else if (totalBalance >= 2000) tier = 'medium';

    const ratios = ALLOCATIONS[tier];
    const allocations: BudgetCategory[] = (
      Object.entries(ratios) as [BudgetCategory['category'], number][]
    ).map(([category, pct]) => ({
      category,
      recommended: parseFloat((totalBalance * pct).toFixed(2)),
      percentage: pct * 100,
    }));

    return {
      totalBudget: parseFloat(totalBalance.toFixed(2)),
      allocations,
      rationale: `Based on ${tier} balance tier. Savings allocation increases with higher balances.`,
    };
  }
}
