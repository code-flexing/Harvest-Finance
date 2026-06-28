import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Vault } from '../database/entities/vault.entity';
import { VaultApyHistory } from '../database/entities/vault-apy-history.entity';
import { VaultScoreHistory } from '../database/entities/vault-score-history.entity';
import { Deposit } from '../database/entities/deposit.entity';

export interface ScoreBreakdown {
  strategyScore: number;
  apyScore: number;
  tvlStabilityScore: number;
  drawdownScore: number;
  operatorScore: number;
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  // Scoring weights (must sum to 100)
  private readonly WEIGHTS = {
    APY: 0.4,
    TVL_STABILITY: 0.25,
    DRAWDOWN: 0.2,
    OPERATOR: 0.15,
  };

  // Scoring thresholds
  private readonly APY_THRESHOLDS = {
    EXCELLENT: 20, // APY >= 20%
    GOOD: 10, // APY >= 10%
    FAIR: 5, // APY >= 5%
    POOR: 0, // APY < 5%
  };

  private readonly TVL_STABILITY_THRESHOLDS = {
    EXCELLENT: 0.95, // 95%+ stable
    GOOD: 0.85, // 85%+ stable
    FAIR: 0.7, // 70%+ stable
    POOR: 0, // < 70% stable
  };

  private readonly DRAWDOWN_THRESHOLDS = {
    EXCELLENT: 0.05, // Max 5% drawdown
    GOOD: 0.1, // Max 10% drawdown
    FAIR: 0.2, // Max 20% drawdown
    POOR: 0.5, // Max 50% drawdown
  };

  // Operator reputation score (based on vault age and performance)
  private readonly OPERATOR_THRESHOLDS = {
    EXCELLENT: 365, // 1+ year
    GOOD: 180, // 6+ months
    FAIR: 30, // 1+ month
    POOR: 0, // < 1 month
  };

  constructor(
    @InjectRepository(Vault) private vaultRepo: Repository<Vault>,
    @InjectRepository(VaultApyHistory)
    private apyHistoryRepo: Repository<VaultApyHistory>,
    @InjectRepository(VaultScoreHistory)
    private scoreHistoryRepo: Repository<VaultScoreHistory>,
    @InjectRepository(Deposit) private depositRepo: Repository<Deposit>,
  ) {}

  /**
   * Calculate APY score (0-100) based on risk-adjusted APY.
   * Higher APY = higher score, but we cap at reasonable levels.
   */
  calculateApyScore(apy: number): number {
    if (apy <= 0) return 0;
    if (apy >= this.APY_THRESHOLDS.EXCELLENT) return 100;
    if (apy >= this.APY_THRESHOLDS.GOOD) return 75;
    if (apy >= this.APY_THRESHOLDS.FAIR) return 50;
    if (apy >= this.APY_THRESHOLDS.POOR) return 25;
    return 0;
  }

  /**
   * Calculate TVL stability score (0-100) based on TVL volatility.
   * Lower volatility = higher score.
   */
  async calculateTvlStabilityScore(vaultId: string): Promise<number> {
    const apyHistory = await this.apyHistoryRepo.find({
      where: { vaultId },
      order: { snapshotDate: 'DESC' },
      take: 30, // Last 30 days
    });

    if (apyHistory.length < 2) {
      return 50; // Default score for insufficient data
    }

    // Calculate coefficient of variation (std dev / mean)
    const apys = apyHistory.map((h) => Number(h.apy));
    const mean = apys.reduce((sum, apy) => sum + apy, 0) / apys.length;

    if (mean === 0) return 50;

    const variance = apys.reduce((sum, apy) => sum + Math.pow(apy - mean, 2), 0) / apys.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;

    // Convert coefficient of variation to stability score
    if (cv <= 0.05) return 100; // Very stable
    if (cv <= 0.1) return 75; // Stable
    if (cv <= 0.2) return 50; // Moderately stable
    if (cv <= 0.3) return 25; // Unstable
    return 0; // Very unstable
  }

  /**
   * Calculate drawdown score (0-100) based on historical maximum drawdown.
   * Lower drawdown = higher score.
   */
  async calculateDrawdownScore(vaultId: string): Promise<number> {
    const apyHistory = await this.apyHistoryRepo.find({
      where: { vaultId },
      order: { snapshotDate: 'ASC' },
      take: 90, // Last 90 days
    });

    if (apyHistory.length < 2) {
      return 50; // Default score for insufficient data
    }

    // Calculate maximum drawdown
    const apys = apyHistory.map((h) => Number(h.apy));
    let peak = apys[0];
    let maxDrawdown = 0;

    for (const apy of apys) {
      if (apy > peak) {
        peak = apy;
      }
      const drawdown = (peak - apy) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Convert drawdown to score
    if (maxDrawdown <= this.DRAWDOWN_THRESHOLDS.EXCELLENT) return 100;
    if (maxDrawdown <= this.DRAWDOWN_THRESHOLDS.GOOD) return 75;
    if (maxDrawdown <= this.DRAWDOWN_THRESHOLDS.FAIR) return 50;
    if (maxDrawdown <= this.DRAWDOWN_THRESHOLDS.POOR) return 25;
    return 0;
  }

  /**
   * Calculate operator reputation score (0-100) based on vault age and performance.
   */
  calculateOperatorScore(vault: Vault): number {
    const ageDays = this.getVaultAgeDays(vault);

    if (ageDays >= this.OPERATOR_THRESHOLDS.EXCELLENT) return 100;
    if (ageDays >= this.OPERATOR_THRESHOLDS.GOOD) return 75;
    if (ageDays >= this.OPERATOR_THRESHOLDS.FAIR) return 50;
    return 25;
  }

  /**
   * Get the age of a vault in days.
   */
  private getVaultAgeDays(vault: Vault): number {
    const now = new Date();
    const created = new Date(vault.createdAt);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate the overall strategy score for a vault.
   */
  async calculateVaultScore(vault: Vault): Promise<ScoreBreakdown> {
    const apy = vault.apy;
    const apyScore = this.calculateApyScore(apy);
    const tvlStabilityScore = await this.calculateTvlStabilityScore(vault.id);
    const drawdownScore = await this.calculateDrawdownScore(vault.id);
    const operatorScore = this.calculateOperatorScore(vault);

    // Calculate weighted average
    const strategyScore = Math.round(
      apyScore * this.WEIGHTS.APY +
        tvlStabilityScore * this.WEIGHTS.TVL_STABILITY +
        drawdownScore * this.WEIGHTS.DRAWDOWN +
        operatorScore * this.WEIGHTS.OPERATOR,
    );

    return {
      strategyScore,
      apyScore,
      tvlStabilityScore,
      drawdownScore,
      operatorScore,
    };
  }

  /**
   * Recalculate scores for all vaults and store them.
   * This is called hourly via cron.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async recalculateAllVaultScores(): Promise<void> {
    this.logger.log('Starting hourly vault score recalculation');

    const vaults = await this.vaultRepo.find();
    const today = new Date();

    for (const vault of vaults) {
      try {
        const scores = await this.calculateVaultScore(vault);

        // Update vault's current score
        await this.vaultRepo.update(vault.id, {
          strategyScore: scores.strategyScore,
        });

        // Save score history snapshot
        await this.scoreHistoryRepo.save({
          vaultId: vault.id,
          strategyScore: scores.strategyScore,
          apyScore: scores.apyScore,
          tvlStabilityScore: scores.tvlStabilityScore,
          drawdownScore: scores.drawdownScore,
          operatorScore: scores.operatorScore,
          snapshotDate: today,
        });

        this.logger.log(
          `Updated score for vault ${vault.id}: ${scores.strategyScore}`,
        );
      } catch (error) {
        this.logger.error(`Error calculating score for vault ${vault.id}:`, error);
      }
    }

    this.logger.log('Completed hourly vault score recalculation');
  }

  /**
   * Get score breakdown for a specific vault.
   */
  async getVaultScoreBreakdown(vaultId: string): Promise<ScoreBreakdown> {
    const vault = await this.vaultRepo.findOne({ where: { id: vaultId } });

    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    return this.calculateVaultScore(vault);
  }

  /**
   * Get score history for a vault.
   */
  async getVaultScoreHistory(
    vaultId: string,
    limit: number = 30,
  ): Promise<VaultScoreHistory[]> {
    return this.scoreHistoryRepo.find({
      where: { vaultId },
      order: { snapshotDate: 'DESC' },
      take: limit,
    });
  }
}
