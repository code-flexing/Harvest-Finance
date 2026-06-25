import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Vault, VaultStatus } from '../database/entities/vault.entity';
import { NotificationType } from '../database/entities/notification.entity';
import { StellarService } from '../stellar/services/stellar.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VaultAccountMonitorService implements OnModuleInit {
  private readonly logger = new Logger(VaultAccountMonitorService.name);

  constructor(
    @InjectRepository(Vault)
    private readonly vaultRepository: Repository<Vault>,
    private readonly stellarService: StellarService,
    private readonly notificationsService: NotificationsService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const job = new CronJob('*/10 * * * *', async () => {
      await this.checkAllVaults();
    });
    this.schedulerRegistry.addCronJob('vaultAccountMonitor', job);
    job.start();
    this.logger.log('Vault account monitor started (every 10 minutes)');
  }

  async checkAllVaults(): Promise<void> {
    this.logger.log('Running vault account merge detection scan');

    const vaults = await this.vaultRepository.find({
      where: [
        { status: VaultStatus.ACTIVE },
        { status: VaultStatus.INACTIVE },
        { status: VaultStatus.FROZEN },
        { status: VaultStatus.FULL_CAPACITY },
      ],
    });

    for (const vault of vaults) {
      if (!vault.stellarAccountAddress) {
        continue;
      }
      if (vault.status === VaultStatus.SUSPENDED) {
        continue;
      }
      await this.checkSingleVault(vault);
    }
  }

  async checkSingleVault(vault: Vault): Promise<void> {
    try {
      await this.stellarService.getAccountInfo(vault.stellarAccountAddress!);
    } catch (err) {
      if (
        err instanceof BadRequestException &&
        err.message.toLowerCase().includes('not found')
      ) {
        await this.suspendVault(vault);
      } else {
        this.logger.warn(
          `Non-404 error checking vault ${vault.id} (${vault.stellarAccountAddress}): ${err?.message}`,
        );
      }
    }
  }

  private async suspendVault(vault: Vault): Promise<void> {
    await this.vaultRepository.update(vault.id, {
      status: VaultStatus.SUSPENDED,
    });

    this.logger.warn(
      JSON.stringify({
        event: 'vault_account_merged',
        vaultId: vault.id,
        stellarAccountAddress: vault.stellarAccountAddress,
        timestamp: new Date().toISOString(),
        action: 'vault_suspended',
      }),
    );

    await this.notificationsService.create({
      adminOnly: true,
      title: 'Vault Stellar Account Merged',
      message: `Vault ${vault.id} (${vault.vaultName}) has been suspended because its linked Stellar account (${vault.stellarAccountAddress}) no longer exists on-chain. The account has likely been merged. Immediate review required.`,
      type: NotificationType.SYSTEM,
    });
  }
}
