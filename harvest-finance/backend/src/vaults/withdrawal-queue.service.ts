import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import { Withdrawal, WithdrawalStatus } from '../database/entities/withdrawal.entity';
import { Vault } from '../database/entities/vault.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../database/entities/notification.entity';

@Injectable()
export class WithdrawalQueueService {
  private readonly logger = new Logger(WithdrawalQueueService.name);

  constructor(
    @InjectRepository(Withdrawal)
    private withdrawalRepo: Repository<Withdrawal>,
    @InjectRepository(Vault)
    private vaultRepo: Repository<Vault>,
    private readonly notificationService: NotificationsService,
  ) {}

  /**
   * Add a withdrawal to the queue (set status to QUEUED) when there is insufficient liquidity.
   * @param withdrawalId The ID of the withdrawal to queue
   */
  async enqueueWithdrawal(withdrawalId: string): Promise<void> {
    await this.withdrawalRepo.update(
      { id: withdrawalId },
      { status: WithdrawalStatus.QUEUED },
    );
    this.logger.log(`Withdrawal ${withdrawalId} queued due to insufficient liquidity`);
  }

  /**
   * Process the withdrawal queue for a given vault in FIFO order.
   * Should be called after a deposit increases liquidity.
   * @param vaultId The ID of the vault to process the queue for
   */
  async processWithdrawalQueue(vaultId: string): Promise<void> {
    this.logger.debug(`Processing withdrawal queue for vault ${vaultId}`);

    // Get the vault to check current liquidity and for notifications
    const vault = await this.vaultRepo.findOne({ where: { id: vaultId } });
    if (!vault) {
      this.logger.error(`Vault ${vaultId} not found`);
      return;
    }

    // Get all queued withdrawals for this vault, ordered by creation time (FIFO)
    const queuedWithdrawals = await this.withdrawalRepo.find({
      where: {
        vaultId: vaultId,
        status: WithdrawalStatus.QUEUED,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    for (const withdrawal of queuedWithdrawals) {
      // Check if vault has sufficient liquidity for this withdrawal
      if (Number(vault.totalDeposits) >= withdrawal.amount) {
        // Process the withdrawal: deduct from vault and mark as confirmed
        vault.totalDeposits = Number(vault.totalDeposits) - withdrawal.amount;
        await this.vaultRepo.save(vault);

        await this.withdrawalRepo.update(
          { id: withdrawal.id },
          {
            status: WithdrawalStatus.CONFIRMED,
            confirmedAt: new Date(),
          },
        );

        // Send notification to user
        await this.notificationService.create({
          userId: withdrawal.userId,
          title: 'Withdrawal Confirmed',
          message: `Your withdrawal of ${withdrawal.amount} from vault ${vault.vaultName} has been confirmed.`,
          type: NotificationType.WITHDRAWAL,
        });

        this.logger.log(
          `Withdrawal ${withdrawal.id} for amount ${withdrawal.amount} processed and confirmed`,
        );
      } else {
        // Not enough liquidity, stop processing since the queue is FIFO
        this.logger.debug(
          `Insufficient liquidity to process withdrawal ${withdrawal.id}. Stopping queue processing.`,
        );
        break;
      }
    }
  }

  /**
   * Get the position of a withdrawal in the queue for its vault.
   * Returns null if the withdrawal is not queued.
   * @param withdrawalId The ID of the withdrawal
   * @returns The 1-based position in the queue, or null if not queued
   */
  async getQueuePosition(withdrawalId: string): Promise<number | null> {
    const withdrawal = await this.withdrawalRepo.findOne({
      where: { id: withdrawalId },
    });

    if (!withdrawal || withdrawal.status !== WithdrawalStatus.QUEUED) {
      return null;
    }

    // Count how many queued withdrawals for the same vault were created before this one
    const position = await this.withdrawalRepo.count({
      where: {
        vaultId: withdrawal.vaultId,
        status: WithdrawalStatus.QUEUED,
        createdAt: LessThanOrEqual(withdrawal.createdAt),
      },
    });

    return position;
  }

  /**
   * Get the estimated wait time for a withdrawal in the queue.
   * This is a simplified estimate based on average deposit rate.
   * For now, we return null as it requires more complex forecasting.
   * @param withdrawalId The ID of the withdrawal
   * @returns Estimated wait time in seconds, or null if not queued or cannot estimate
   */
  async getEstimatedWaitTime(withdrawalId: string): Promise<number | null> {
    // In a real implementation, we would calculate based on historical deposit rates.
    // For simplicity, we return null indicating that estimation is not implemented.
    return null;
  }
}