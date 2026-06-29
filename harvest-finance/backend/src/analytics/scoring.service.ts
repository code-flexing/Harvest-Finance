import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Vault } from '../database/entities/vault.entity';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    @InjectRepository(Vault)
    private readonly vaultRepository: Repository<Vault>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async updateAllVaultScores() {
    this.logger.log('Starting hourly vault score update...');
    const vaults = await this.vaultRepository.find();
    
    for (const vault of vaults) {
      const { score, breakdown } = this.calculateVaultScore(vault);
      vault.strategyScore = score;
      await this.vaultRepository.save(vault);
      this.logger.debug(`Updated vault ${vault.id} score to ${score}`);
    }
    
    this.logger.log('Completed hourly vault score update.');
  }

  calculateVaultScore(vault: Vault): { score: number; breakdown: any } {
    // This is a placeholder for the actual calculations
    // Weights: APY (40%), TVL stability (25%), drawdown (20%), operator score (15%)
    
    // Example metrics (in a real app, these would come from historical data)
    const currentApy = (vault as any).apy || 0;
    const apyScore = Math.min(currentApy / 20 * 100, 100); // Assume 20% is max expected APY
    
    // Fake values for TVL stability, drawdown, and operator score
    const tvlStabilityScore = 80;
    const drawdownScore = 90;
    const operatorScore = 85;

    const weightedApy = apyScore * 0.40;
    const weightedTvl = tvlStabilityScore * 0.25;
    const weightedDrawdown = drawdownScore * 0.20;
    const weightedOperator = operatorScore * 0.15;

    const totalScore = Math.round(weightedApy + weightedTvl + weightedDrawdown + weightedOperator);

    return {
      score: totalScore,
      breakdown: {
        apy: weightedApy,
        tvlStability: weightedTvl,
        drawdown: weightedDrawdown,
        operator: weightedOperator,
      }
    };
  }

  async getVaultScoreBreakdown(vaultId: string) {
    const vault = await this.vaultRepository.findOne({ where: { id: vaultId } });
    if (!vault) {
      return null;
    }
    return this.calculateVaultScore(vault);
  }
}
