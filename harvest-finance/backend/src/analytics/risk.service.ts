import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Vault } from '../database/entities/vault.entity';
import { Deposit } from '../database/entities/deposit.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../database/entities/notification.entity';

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  constructor(
    @InjectRepository(Vault) private vaultRepo: Repository<Vault>,
    @InjectRepository(Deposit) private depositRepo: Repository<Deposit>,
    private readonly notificationService: NotificationsService,
  ) {}

  /**
   * Calculate depositor concentration for a given vault.
   * Returns an array of objects containing userId and their concentration percentage.
   */
  async calculateDepositorConcentration(vaultId: string): Promise<Array<{ userId: string; concentration: number }>> {
    const query = this.depositRepo
      .createQueryBuilder('deposit')
      .select('deposit.userId', 'userId')
      .addSelect('SUM(deposit.amount)', 'totalAmount')
      .where('deposit.vaultId = :vaultId', { vaultId })
      .andWhere('deposit.status = :status', { status: 'CONFIRMED' })
      .groupBy('deposit.userId');

    const results = await query.getRawMany<{ userId: string; totalAmount: string }>();

    // Get total vault TVL (sum of all confirmed deposits)
    const totalResult = await this.depositRepo
      .createQueryBuilder('deposit')
      .select('COALESCE(SUM(deposit.amount), 0)', 'total')
      .where('deposit.vaultId = :vaultId', { vaultId })
      .andWhere('deposit.status = :status', { status: 'CONFIRMED' })
      .getRawOne<{ total: string }>();

    const vaultTvl = parseFloat(totalResult?.total ?? '0');

    if (vaultTvl === 0) {
      return [];
    }

    return results.map(result => ({
      userId: result.userId,
      concentration: parseFloat(result.totalAmount) / vaultTvl,
    }));
  }

  /**
   * Check all vaults for depositor concentration risk and send alerts if thresholds are exceeded.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkVaultConcentrationRisks() {
    this.logger.log('Starting hourly depositor concentration risk check');

    const vaults = await this.vaultRepo.find();

    for (const vault of vaults) {
      try {
        const concentrations = await this.calculateDepositorConcentration(vault.id);
        const maxConcentration = Math.max(...concentrations.map(c => c.concentration), 0);

        // If any depositor exceeds the threshold, send an alert
        if (maxConcentration > vault.depositorConcentrationThreshold) {
          // Find the depositor(s) exceeding the threshold
          const offendingDepositors = concentrations.filter(c => c.concentration > vault.depositorConcentrationThreshold);

          for (const depositor of offendingDepositors) {
            await this.notificationService.create({
              userId: vault.ownerId, // Send alert to vault owner
              title: `Depositor Concentration Risk Alert for Vault ${vault.vaultName}`,
              message: `Depositor ${depositor.userId} controls ${(depositor.concentration * 100).toFixed(2)}% of vault TVL, exceeding the configured threshold of ${(vault.depositorConcentrationThreshold * 100).toFixed(2)}%`,
              type: NotificationType.DEPOSITOR_CONCENTRATION,
              adminOnly: false,
            });
          }

          this.logger.warn(`Vault ${vault.id} (${vault.vaultName}) has depositor concentration risk: max concentration ${(maxConcentration * 100).toFixed(2)}% exceeds threshold ${(vault.depositorConcentrationThreshold * 100).toFixed(2)}%`);
        }
      } catch (error) {
        this.logger.error(`Error checking concentration risk for vault ${vault.id}:`, error);
      }
    }

    this.logger.log('Completed hourly depositor concentration risk check');
  }

  /**
   * Get depositor concentration data for a specific vault.
   * Used for the risk-metrics endpoint.
   */
  async getVaultDepositorConcentration(vaultId: string): Promise<{
    vaultId: string;
    totalVaultTvl: number;
    depositorConcentrations: Array<{ userId: string; concentration: number; percentage: string }>;
    maxConcentration: number;
    threshold: number;
  }> {
    const concentrations = await this.calculateDepositorConcentration(vaultId);
    const vault = await this.vaultRepo.findOne({ where: { id: vaultId } });

    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    // Get total vault TVL again for consistency
    const totalResult = await this.depositRepo
      .createQueryBuilder('deposit')
      .select('COALESCE(SUM(deposit.amount), 0)', 'total')
      .where('deposit.vaultId = :vaultId', { vaultId })
      .andWhere('deposit.status = :status', { status: 'CONFIRMED' })
      .getRawOne<{ total: string }>();

    const totalVaultTvl = parseFloat(totalResult?.total ?? '0');

    return {
      vaultId,
      totalVaultTvl,
      depositorConcentrations: concentrations.map(c => ({
        userId: c.userId,
        concentration: c.concentration,
        percentage: `${(c.concentration * 100).toFixed(2)}%`,
      })),
      maxConcentration: Math.max(...concentrations.map(c => c.concentration), 0),
      threshold: vault.depositorConcentrationThreshold,
    };
  }
}