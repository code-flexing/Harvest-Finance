import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { format } from 'date-fns';
import { Deposit, DepositStatus } from '../../database/entities/deposit.entity';
import { HistoricalAnalytics, TimeSeriesPoint } from '../dto/intelligence.dto';

@Injectable()
export class HistoricalAnalyticsService {
  constructor(
    @InjectRepository(Deposit) private depositRepo: Repository<Deposit>,
  ) {}

  async getAnalytics(userId: string): Promise<HistoricalAnalytics> {
    const deposits = await this.depositRepo.find({
      where: { userId, status: DepositStatus.CONFIRMED },
      order: { createdAt: 'ASC' },
    });

    const transactionHistory: TimeSeriesPoint[] = deposits.map((d) => ({
      date: d.createdAt.toISOString(),
      value: parseFloat(Number(d.amount).toFixed(2)),
      label: 'Deposit to vault',
    }));

    const monthlyMap = new Map<string, number>();
    for (const d of deposits) {
      const key = format(d.createdAt, 'yyyy-MM');
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(d.amount));
    }
    const monthlyDeposits: TimeSeriesPoint[] = Array.from(
      monthlyMap.entries(),
    ).map(([date, value]) => ({ date, value: parseFloat(value.toFixed(2)) }));

    let running = 0;
    const vaultGrowth: TimeSeriesPoint[] = deposits.map((d) => {
      running += Number(d.amount);
      return {
        date: d.createdAt.toISOString(),
        value: parseFloat(running.toFixed(2)),
      };
    });

    return { transactionHistory, monthlyDeposits, vaultGrowth };
  }
}
