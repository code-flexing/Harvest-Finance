import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, Equal } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Vault, VaultStatus } from '../database/entities/vault.entity';
import { NotificationType } from '../database/entities/notification.entity';
import { StellarService } from '../stellar/services/stellar.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VaultAccountMonitorService implements OnModuleInit {
  private readonly logger = new Logger(VaultAccountMonitorService.name);
  private running = false;

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
    if (this.running) {
      this.logger.warn('Vault account check already in progress, skipping this cycle');
      return;
    }
    this.running = true;
    try {
      await this.runVaultChecks();
    } finally {
      this.running = false;
    }
  }

  private async runVaultChecks(): Promise<void> {
    this.logger.log('Running vault account merge detection scan');

    const vaults = await this.vaultRepository.find({
      select: ['id', 'stellarAccountAddress', 'status', 'ownerId', 'vaultName'],
      where: {
        stellarAccountAddress: Not(IsNull()),
        status: Not(Equal(VaultStatus.SUSPENDED)),
      },
    });

    for (const vault of vaults) {
      await this.checkSingleVault(vault);
    }
  }


  async checkSingleVault(vault: Vault): Promise<void> {
    try {
      await this.stellarService.getAccountInfo(vault.stellarAccountAddress!);
    } catch (err) {
      if (
        (err instanceof BadRequestException &&
          err.message.toLowerCase().includes('not found')) ||
        (err as any)?.status === 404
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

    // Audit trail: structured error-level log consumed by ops monitoring.
    // No dedicated audit_log table exists in this project; this log entry is
    // the verifiable record of the vault_account_merged event.
    this.logger.error(
      JSON.stringify({
        event: 'vault_account_merged',
        vaultId: vault.id,
        stellarAccountAddress: vault.stellarAccountAddress,
        timestamp: new Date().toISOString(),
        action: 'vault_suspended',
      }),
    );

    const alertTitle = 'Vault Stellar Account Merged';
    const alertMessage = `Vault ${vault.id} (${vault.vaultName}) has been suspended because its linked Stellar account (${vault.stellarAccountAddress}) no longer exists on-chain. The account has likely been merged. Immediate review required.`;

    // Notify the vault owner
    await this.notificationsService.create({
      userId: vault.ownerId,
      adminOnly: false,
      title: alertTitle,
      message: alertMessage,
      type: NotificationType.SYSTEM,
    });

    // Broadcast to platform admins via adminOnly record (surfaced in admin dashboard
    // via NotificationsService.findAdminNotifications() / admin API endpoint)
    await this.notificationsService.create({
      userId: null,
      adminOnly: true,
      title: alertTitle,
      message: alertMessage,
      type: NotificationType.SYSTEM,
    });
  }
}
