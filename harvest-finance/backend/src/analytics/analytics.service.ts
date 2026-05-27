import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vault, VaultStatus } from '../database/entities/vault.entity';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';
import {
  Withdrawal,
  WithdrawalStatus,
} from '../database/entities/withdrawal.entity';
import {
  FunnelConversionDto,
  TrackFunnelEventDto,
  VaultMetricsDto,
  SystemMetricsDto,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  private readonly startedAt = Date.now();
  private requestCount = 0;
  private errorCount = 0;
  private readonly funnelEvents: Array<{
    eventName: string;
    funnelName: string;
    stepName: string;
    sessionId: string;
    timestamp: string;
  }> = [];
  private readonly maxTrackedEvents = 10000;

  constructor(
    @InjectRepository(Vault) private vaultRepo: Repository<Vault>,
    @InjectRepository(Deposit) private depositRepo: Repository<Deposit>,
    @InjectRepository(Withdrawal)
    private withdrawalRepo: Repository<Withdrawal>,
  ) {}

  incrementRequests() {
    this.requestCount++;
  }
  incrementErrors() {
    this.errorCount++;
  }

  async getVaultMetrics(): Promise<VaultMetricsDto> {
    const [totalVaults, activeVaults] = await Promise.all([
      this.vaultRepo.count(),
      this.vaultRepo.count({ where: { status: VaultStatus.ACTIVE } }),
    ]);

    const [depositSum, withdrawalSum, vaults] = await Promise.all([
      this.depositRepo
        .createQueryBuilder('d')
        .select('COALESCE(SUM(d.amount), 0)', 'total')
        .where('d.status = :s', { s: DepositStatus.CONFIRMED })
        .getRawOne<{ total: string }>(),
      this.withdrawalRepo
        .createQueryBuilder('w')
        .select('COALESCE(SUM(w.amount), 0)', 'total')
        .where('w.status = :s', { s: WithdrawalStatus.CONFIRMED })
        .getRawOne<{ total: string }>(),
      this.vaultRepo.find({ select: ['totalDeposits', 'maxCapacity'] }),
    ]);

    const avgUtilizationPct =
      vaults.length === 0
        ? 0
        : vaults.reduce((acc, v) => {
            const cap = Number(v.maxCapacity);
            return acc + (cap > 0 ? (Number(v.totalDeposits) / cap) * 100 : 0);
          }, 0) / vaults.length;

    return {
      totalVaults,
      activeVaults,
      totalDepositsUsd: parseFloat(depositSum?.total ?? '0'),
      totalWithdrawalsUsd: parseFloat(withdrawalSum?.total ?? '0'),
      avgUtilizationPct: Math.round(avgUtilizationPct * 100) / 100,
    };
  }

  getSystemMetrics(): SystemMetricsDto {
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000);
    const errorRate =
      this.requestCount === 0 ? 0 : (this.errorCount / this.requestCount) * 100;

    return {
      uptimeSeconds,
      totalApiRequests: this.requestCount,
      totalErrors: this.errorCount,
      errorRate: Math.round(errorRate * 100) / 100,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  trackFunnelEvent(dto: TrackFunnelEventDto) {
    this.funnelEvents.push({
      eventName: dto.eventName,
      funnelName: dto.funnelName,
      stepName: dto.stepName,
      sessionId: dto.sessionId,
      timestamp: new Date().toISOString(),
    });

    if (this.funnelEvents.length > this.maxTrackedEvents) {
      this.funnelEvents.splice(
        0,
        this.funnelEvents.length - this.maxTrackedEvents,
      );
    }

    return { accepted: true };
  }

  getFunnelConversion(
    funnelName: string,
    fromStep = 'Click Deposit',
    toStep = 'Transaction Confirmed',
  ): FunnelConversionDto {
    const events = this.funnelEvents.filter(
      (event) => event.funnelName === funnelName,
    );

    const steps = Array.from(
      events.reduce((map, event) => {
        map.set(event.stepName, (map.get(event.stepName) ?? 0) + 1);
        return map;
      }, new Map<string, number>()),
    ).map(([stepName, count]) => ({ stepName, count }));

    const startSessions = new Set(
      events
        .filter((event) => event.stepName === fromStep)
        .map((event) => event.sessionId),
    );
    const endSessions = new Set(
      events
        .filter((event) => event.stepName === toStep)
        .map((event) => event.sessionId),
    );

    const conversionRatePct =
      startSessions.size === 0
        ? 0
        : Math.round((endSessions.size / startSessions.size) * 10000) / 100;

    return {
      funnelName,
      fromStep,
      toStep,
      conversionRatePct,
      uniqueSessionsAtStart: startSessions.size,
      uniqueSessionsAtEnd: endSessions.size,
      steps,
    };
  }
}
