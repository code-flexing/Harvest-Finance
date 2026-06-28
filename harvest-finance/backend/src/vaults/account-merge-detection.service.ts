import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from 'stellar-sdk';
import { Vault, VaultStatus } from '../database/entities/vault.entity';
import { User } from '../database/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../database/entities/notification.entity';

@Injectable()
export class AccountMergeDetectionService {
  private readonly logger = new Logger(AccountMergeDetectionService.name);
  private readonly server: StellarSdk.Horizon.Server;

  constructor(
    @InjectRepository(Vault)
    private readonly vaultRepository: Repository<Vault>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    const network = this.configService.get<string>('STELLAR_NETWORK', 'testnet');
    const url =
      network === 'mainnet'
        ? 'https://horizon.stellar.org'
        : 'https://horizon-testnet.stellar.org';
    this.server = new StellarSdk.Horizon.Server(url);
  }

  /**
   * Every 10 minutes: check all vault owner Stellar accounts for existence.
   * If an account is not found (merged/deleted), suspend the vault and alert admins.
   */
  @Cron('0 */10 * * * *')
  async checkVaultAccountExistence(): Promise<void> {
    const isTest = this.configService.get<string>('NODE_ENV') === 'test';
    if (isTest) return;

    this.logger.log('Starting vault Stellar account merge detection check');

    const vaults = await this.vaultRepository.find({
      where: [{ status: VaultStatus.ACTIVE }, { status: VaultStatus.INACTIVE }],
    });

    if (vaults.length === 0) return;

    const ownerIds = [...new Set(vaults.map((v) => v.ownerId))];

    const users = await this.userRepository.findBy(
      ownerIds.map((id) => ({ id })),
    );

    const userMap = new Map(users.map((u) => [u.id, u]));

    for (const vault of vaults) {
      const user = userMap.get(vault.ownerId);
      if (!user?.stellarAddress) continue;

      await this.checkAccount(vault, user.stellarAddress);
    }

    this.logger.log('Vault Stellar account merge detection check complete');
  }

  /**
   * Checks a single Stellar account. If not found, suspends the vault and alerts.
   * Exposed for direct calls in tests and manual triggers.
   */
  async checkAccount(vault: Vault, stellarAddress: string): Promise<void> {
    try {
      await this.server.loadAccount(stellarAddress);
    } catch (err: unknown) {
      const isNotFound =
        err instanceof Error &&
        (err.message.includes('NotFoundError') ||
          err.message.includes('not found') ||
          (err as any)?.response?.status === 404);

      if (!isNotFound) {
        this.logger.warn(
          `Non-404 error checking account ${stellarAddress} for vault ${vault.id}: ${(err as Error).message}`,
        );
        return;
      }

      this.logger.warn(
        `Stellar account ${stellarAddress} for vault ${vault.id} not found — likely merged. Suspending vault.`,
      );

      await this.vaultRepository.update(vault.id, {
        status: VaultStatus.FROZEN,
      });

      await this.writeAuditEntry(vault.id, stellarAddress);
      await this.alertAdmins(vault.id, stellarAddress);
    }
  }

  private async writeAuditEntry(
    vaultId: string,
    stellarAddress: string,
  ): Promise<void> {
    await this.notificationsService.create({
      userId: null,
      adminOnly: true,
      title: 'Vault Suspended: Stellar Account Merged',
      message: `Vault ${vaultId} has been suspended because its linked Stellar account (${stellarAddress}) was not found on the network — the account has likely been merged into another account.`,
      type: NotificationType.SYSTEM,
    });
  }

  private async alertAdmins(
    vaultId: string,
    stellarAddress: string,
  ): Promise<void> {
    await this.notificationsService.create({
      userId: null,
      adminOnly: true,
      title: 'ALERT: Vault Account Merge Detected',
      message: `Action required: Vault ID=${vaultId} linked to Stellar address ${stellarAddress} has been automatically frozen. The Stellar account was not found — it has been merged or deleted. Please review the vault and notify the owner.`,
      type: NotificationType.ERROR,
    });

    this.logger.warn(
      `ADMIN ALERT: Vault ${vaultId} frozen — Stellar account ${stellarAddress} merged/not found`,
    );
  }
}
