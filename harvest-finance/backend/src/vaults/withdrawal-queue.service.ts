import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { EventBus } from '@nestjs/cqrs';
import { Withdrawal, WithdrawalStatus } from '../database/entities/withdrawal.entity';
import { Vault } from '../database/entities/vault.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../database/entities/notification.entity';
import { VaultDebitedEvent } from './cqrs/events/vault-debited.event';

@Injectable()
export class WithdrawalQueueService {
  private readonly logger = new Logger(WithdrawalQueueService.name);

  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(Vault)
    private readonly vaultRepository: Repository<Vault>,
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBus,
    private readonly notificationService: NotificationsService,
  ) {}

  /**
   * Add a withdrawal to the queue (set status to QUEUED) when there is insufficient liquidity.
   */
  async enqueueWithdrawal(withdrawalId: string): Promise<void> {
    await this.withdrawalRepository.update(
      { id: withdrawalId },
      { status: WithdrawalStatus.QUEUED, queuedAt: new Date() },
    );
    this.logger.log(`Withdrawal ${withdrawalId} queued due to insufficient liquidity`);
  }

  /**
   * Process the withdrawal queue for a given vault in strict atomic FIFO order.
   * Leverages pessimistic database locks to prevent multi-node concurrency race conditions.
   */
  async processQueue(vaultId: string, availableLiquidity: number): Promise<void> {
    const processedWithdrawals: Withdrawal[] = [];

    // Fetch the vault structure inside a transaction block to ensure entity synchronicity
    const vault = await this.vaultRepository.findOne({ where: { id: vaultId } });
    if (!vault) {
      this.logger.error(`Vault ${vaultId} not found`);
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      // Lock queued items to prevent race conditions during concurrent processing
      const queuedWithdrawals = await manager.find(Withdrawal, {
        where: { vaultId, status: WithdrawalStatus.QUEUED },
        order: { queuedAt: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });

      let currentLiquidity = availableLiquidity;

      for (const withdrawal of queuedWithdrawals) {
        const amount = Number(withdrawal.amount);

        if (amount <= currentLiquidity) {
          // Fulfill the withdrawal
          withdrawal.status = WithdrawalStatus.CONFIRMED;
          withdrawal.confirmedAt = new Date();
          
          await manager.save(withdrawal);
          
          // Deduct from the vault's available pool safely inside the write lock
          await manager.decrement(Vault, { id: vaultId }, 'totalDeposits', amount);
          
          currentLiquidity -= amount;
          processedWithdrawals.push(withdrawal);
          
          this.logger.log(`Processed queued withdrawal ${withdrawal.id} for vault ${vaultId}`);
        } else {
          // FIFO constraint: break early if we cannot fulfill the oldest remaining item.
          this.logger.debug(`Insufficient liquidity to process withdrawal ${withdrawal.id}. Stopping queue processing.`);
          break;
        }
      }
    });

    // Publish event logs and trigger user notifications safely OUTSIDE the db lock matrix
    for (const withdrawal of processedWithdrawals) {
      this.eventBus.publish(new VaultDebitedEvent(vaultId, withdrawal.userId, Number(withdrawal.amount)));
      
      await this.notificationService.create({
        userId: withdrawal.userId,
        title: 'Withdrawal Confirmed',
        message: `Your withdrawal of ${withdrawal.amount} has been successfully processed and confirmed.`,
        type: NotificationType.WITHDRAWAL,
      });
    }
  }

  /**
   * Main processing entry point compatible with main branch legacy hooks
   */
  async processWithdrawalQueue(vaultId: string): Promise<void> {
    this.logger.debug(`Processing withdrawal queue for vault ${vaultId}`);
    const vault = await this.vaultRepository.findOne({ where: { id: vaultId } });
    if (!vault) return;
    
    await this.processQueue(vaultId, Number(vault.totalDeposits));
  }

  /**
   * Evaluates exact position tracking relative to the user's oldest unfulfilled request
   */
  async getQueueMetrics(userId: string, vaultId: string): Promise<{ positionInQueue: number; estimatedWaitTime: string }> {
    const userOldestQueued = await this.withdrawalRepository.findOne({
      where: { userId, vaultId, status: WithdrawalStatus.QUEUED },
      order: { queuedAt: 'ASC' },
    });

    if (!userOldestQueued || !userOldestQueued.queuedAt) {
      return { positionInQueue: 0, estimatedWaitTime: 'No active queue' };
    }

    const countBefore = await this.withdrawalRepository.count({
      where: {
        vaultId,
        status: WithdrawalStatus.QUEUED,
        queuedAt: LessThan(userOldestQueued.queuedAt),
      },
    });

    return {
      positionInQueue: countBefore + 1,
      estimatedWaitTime: 'Pending liquidity',
    };
  }

  /**
   * Compatibility wrapper method to support scalar position tracking indices
   */
  async getQueuePosition(withdrawalId: string): Promise<number | null> {
    const withdrawal = await this.withdrawalRepository.findOne({ where: { id: withdrawalId } });
    if (!withdrawal || withdrawal.status !== WithdrawalStatus.QUEUED || !withdrawal.queuedAt) {
      return null;
    }

    const metrics = await this.getQueueMetrics(withdrawal.userId, withdrawal.vaultId);
    return metrics.positionInQueue > 0 ? metrics.positionInQueue : null;
  }

  /**
   * Compatibility hook mapping for time estimates
   */
  async getEstimatedWaitTime(withdrawalId: string): Promise<string | null> {
    const withdrawal = await this.withdrawalRepository.findOne({ where: { id: withdrawalId } });
    if (!withdrawal || withdrawal.status !== WithdrawalStatus.QUEUED) return null;
    return 'Pending liquidity';
  }
}
