import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { HarvestService } from './harvest.service';

@Injectable()
export class HarvestSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(HarvestSchedulerService.name);
  private cronExpression: string;

  constructor(
    private harvestService: HarvestService,
    private configService: ConfigService,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    // Default to every 5 minutes, but configurable via env
    this.cronExpression =
      this.configService.get<string>('HARVEST_CRON_EXPRESSION') ||
      '*/5 * * * *';
    this.logger.log(
      `Harvest scheduler initialized with cron expression: ${this.cronExpression}`,
    );
  }

  onModuleInit() {
    this.registerHarvestJob();
  }

  private registerHarvestJob() {
    try {
      const harvestJob = new CronJob(this.cronExpression, async () => {
        await this.handleHarvest();
      });

      this.schedulerRegistry.addCronJob('harvestJob', harvestJob);
      harvestJob.start();

      this.logger.log(
        `Harvest cron job registered and started with expression: ${this.cronExpression}`,
      );
    } catch (error) {
      this.logger.error('Failed to register harvest cron job', error);
    }
  }

  async handleHarvest() {
    this.logger.log('Scheduled harvest job triggered');

    try {
      // For now, we'll harvest a specific vault. In production, this should iterate through all active vaults
      const vaultAddress = this.configService.get<string>(
        'DEFAULT_VAULT_ADDRESS',
      );

      if (!vaultAddress) {
        this.logger.warn(
          'No DEFAULT_VAULT_ADDRESS configured, skipping harvest',
        );
        return;
      }

      const result = await this.harvestService.performHarvest(vaultAddress);

      if (result.success) {
        this.logger.log(
          `Scheduled harvest completed successfully. TxHash: ${result.txHash}`,
        );
      } else {
        this.logger.error(`Scheduled harvest failed: ${result.error}`);
      }
    } catch (error) {
      this.logger.error('Scheduled harvest job failed with exception', error);
    }
  }
}
