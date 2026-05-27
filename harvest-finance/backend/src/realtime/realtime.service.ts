import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User } from '../database/entities/user.entity';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';
import {
  Withdrawal,
  WithdrawalStatus,
} from '../database/entities/withdrawal.entity';
import { Vault, VaultStatus } from '../database/entities/vault.entity';
import {
  FarmVault,
  FarmVaultStatus,
} from '../database/entities/farm-vault.entity';
import { Reward } from '../database/entities/reward.entity';
import { RealtimeGateway } from './realtime.gateway';

// ─── Thresholds for alert triggers ───────────────────────────────────────────
const ALERT_THRESHOLDS = {
  LARGE_DEPOSIT: 10_000, // single deposit > $10k
  LARGE_WITHDRAWAL: 5_000, // single withdrawal > $5k
  VAULT_CAPACITY_PCT: 90, // vault at ≥90% capacity
  LOW_SAVINGS: 100, // farmer savings < $100
};

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Deposit) private depositRepo: Repository<Deposit>,
    @InjectRepository(Withdrawal)
    private withdrawalRepo: Repository<Withdrawal>,
    @InjectRepository(Vault) private vaultRepo: Repository<Vault>,
    @InjectRepository(FarmVault) private farmVaultRepo: Repository<FarmVault>,
    @InjectRepository(Reward) private rewardRepo: Repository<Reward>,
    private readonly dataSource: DataSource,
    private readonly gateway: RealtimeGateway,
  ) {}

  // ─── Platform metrics (admin) ─────────────────────────────────────────────

  /** Runs every 30 seconds — pushes live platform KPIs to admin room */
  @Cron('*/30 * * * * *')
  async broadcastPlatformMetrics() {
    try {
      const metrics = await this.getPlatformMetrics();
      this.gateway.emitPlatformMetrics(metrics);
    } catch (err) {
      this.logger.error('Failed to broadcast platform metrics', err);
    }
  }

  async getPlatformMetrics() {
    const [
      totalUsers,
      activeUsers,
      depositResult,
      withdrawalResult,
      activeVaults,
      rewardResult,
      recentDeposits,
      recentWithdrawals,
    ] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { isActive: true } }),
      this.depositRepo
        .createQueryBuilder('d')
        .select('SUM(d.amount)', 'total')
        .where('d.status = :s', { s: DepositStatus.CONFIRMED })
        .getRawOne(),
      this.withdrawalRepo
        .createQueryBuilder('w')
        .select('SUM(w.amount)', 'total')
        .where('w.status = :s', { s: WithdrawalStatus.CONFIRMED })
        .getRawOne(),
      this.vaultRepo.count({ where: { status: VaultStatus.ACTIVE } }),
      this.rewardRepo
        .createQueryBuilder('r')
        .select('SUM(r.accruedAmount)', 'total')
        .getRawOne(),
      // last 5 deposits for live feed
      this.depositRepo.find({
        where: { status: DepositStatus.CONFIRMED },
        order: { createdAt: 'DESC' },
        take: 5,
        relations: ['user', 'vault'],
      }),
      // last 5 withdrawals for live feed
      this.withdrawalRepo.find({
        where: { status: WithdrawalStatus.CONFIRMED },
        order: { createdAt: 'DESC' },
        take: 5,
        relations: ['user', 'vault'],
      }),
    ]);

    return {
      timestamp: new Date().toISOString(),
      totalUsers,
      activeUsers,
      totalDeposits: parseFloat(depositResult?.total || '0'),
      totalWithdrawals: parseFloat(withdrawalResult?.total || '0'),
      activeVaults,
      totalRewards: parseFloat(rewardResult?.total || '0'),
      recentDeposits: recentDeposits.map((d) => ({
        id: d.id,
        amount: Number(d.amount),
        vaultName: d.vault?.vaultName ?? 'Unknown',
        createdAt: d.createdAt,
      })),
      recentWithdrawals: recentWithdrawals.map((w) => ({
        id: w.id,
        amount: Number(w.amount),
        vaultName: w.vault?.vaultName ?? 'Unknown',
        createdAt: w.createdAt,
      })),
    };
  }

  // ─── Farmer KPIs ──────────────────────────────────────────────────────────

  async getFarmerMetrics(userId: string) {
    const [depositResult, farmVaults, rewardResult] = await Promise.all([
      this.depositRepo
        .createQueryBuilder('d')
        .select('SUM(d.amount)', 'total')
        .where('d.userId = :userId', { userId })
        .andWhere('d.status = :s', { s: DepositStatus.CONFIRMED })
        .getRawOne(),
      this.farmVaultRepo.find({
        where: { userId, status: FarmVaultStatus.ACTIVE },
        relations: ['cropCycle'],
      }),
      this.rewardRepo
        .createQueryBuilder('r')
        .select('SUM(r.accruedAmount)', 'total')
        .where('r.userId = :userId', { userId })
        .getRawOne(),
    ]);

    const totalSavings = parseFloat(depositResult?.total || '0');
    const totalRewards = parseFloat(rewardResult?.total || '0');

    // Compute crop yield progress across active farm vaults
    const cropYields = farmVaults.map((fv) => {
      const now = Date.now();
      const start = new Date(fv.startDate).getTime();
      const duration = fv.cropCycle.durationDays * 86_400_000;
      const progress = Math.min(
        100,
        Math.round(((now - start) / duration) * 100),
      );
      const yieldRate = Number(fv.cropCycle.yieldRate);
      const balance = Number(fv.balance);
      return {
        vaultId: fv.id,
        name: fv.name,
        cropCycle: fv.cropCycle.name,
        balance,
        targetAmount: Number(fv.targetAmount),
        progressPercent: progress,
        projectedYield: parseFloat((balance * yieldRate).toFixed(2)),
      };
    });

    return {
      timestamp: new Date().toISOString(),
      userId,
      totalSavings,
      totalRewards,
      activeFarmVaults: farmVaults.length,
      cropYields,
    };
  }

  /** Push farmer KPIs on demand (called after deposit/withdrawal events) */
  async broadcastFarmerMetrics(userId: string) {
    try {
      const metrics = await this.getFarmerMetrics(userId);
      this.gateway.emitFarmerMetrics(userId, metrics);
      await this.checkFarmerAlerts(userId, metrics.totalSavings);
    } catch (err) {
      this.logger.error(
        `Failed to broadcast farmer metrics for ${userId}`,
        err,
      );
    }
  }

  // ─── Alert engine ─────────────────────────────────────────────────────────

  /** Check vault capacity alerts — runs every minute */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkVaultCapacityAlerts() {
    try {
      const vaults = await this.vaultRepo.find({
        where: { status: VaultStatus.ACTIVE },
      });
      for (const vault of vaults) {
        const pct =
          Number(vault.maxCapacity) > 0
            ? (Number(vault.totalDeposits) / Number(vault.maxCapacity)) * 100
            : 0;
        if (pct >= ALERT_THRESHOLDS.VAULT_CAPACITY_PCT) {
          this.gateway.emitAlert('admin', {
            type: 'VAULT_CAPACITY',
            severity: pct >= 100 ? 'critical' : 'warning',
            message: `Vault "${vault.vaultName}" is at ${Math.round(pct)}% capacity.`,
            vaultId: vault.id,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      this.logger.error('Vault capacity alert check failed', err);
    }
  }

  /** Check a single deposit for large-transaction alert */
  async checkDepositAlert(userId: string, amount: number, vaultName: string) {
    if (amount >= ALERT_THRESHOLDS.LARGE_DEPOSIT) {
      const payload = {
        type: 'LARGE_DEPOSIT',
        severity: 'warning',
        message: `Large deposit of $${amount.toLocaleString()} into "${vaultName}".`,
        amount,
        timestamp: new Date().toISOString(),
      };
      this.gateway.emitAlert('admin', payload);
      this.gateway.emitAlert(userId, payload);
    }
  }

  /** Check a single withdrawal for large-transaction alert */
  async checkWithdrawalAlert(
    userId: string,
    amount: number,
    vaultName: string,
  ) {
    if (amount >= ALERT_THRESHOLDS.LARGE_WITHDRAWAL) {
      const payload = {
        type: 'LARGE_WITHDRAWAL',
        severity: 'warning',
        message: `Large withdrawal of $${amount.toLocaleString()} from "${vaultName}".`,
        amount,
        timestamp: new Date().toISOString(),
      };
      this.gateway.emitAlert('admin', payload);
      this.gateway.emitAlert(userId, payload);
    }
  }

  private async checkFarmerAlerts(userId: string, totalSavings: number) {
    if (totalSavings > 0 && totalSavings < ALERT_THRESHOLDS.LOW_SAVINGS) {
      this.gateway.emitAlert(userId, {
        type: 'LOW_SAVINGS',
        severity: 'warning',
        message: `Your savings balance is below $${ALERT_THRESHOLDS.LOW_SAVINGS}. Consider making a deposit.`,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
