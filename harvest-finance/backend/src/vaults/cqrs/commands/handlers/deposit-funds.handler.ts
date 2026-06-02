import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { DepositFundsCommand } from '../deposit-funds.command';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Deposit, DepositStatus } from '../../../database/entities/deposit.entity';
import { Vault, VaultStatus } from '../../../database/entities/vault.entity';
import { NotificationsService } from '../../../notifications/notifications.service';
import { NotificationType } from '../../../database/entities/notification.entity';
import { VaultCreditedEvent } from '../../events/vault-credited.event';
import { BadRequestException, NotFoundException } from '@nestjs/common';

@CommandHandler(DepositFundsCommand)
export class DepositFundsHandler implements ICommandHandler<DepositFundsCommand> {
  constructor(
    @InjectRepository(Deposit)
    private readonly depositRepository: Repository<Deposit>,
    @InjectRepository(Vault)
    private readonly vaultRepository: Repository<Vault>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DepositFundsCommand) {
    const { vaultId, userId, amount, idempotencyKey } = command;

    if (amount <= 0) throw new BadRequestException('Deposit amount must be > 0');

    // idempotency check
    if (idempotencyKey) {
      const existing = await this.depositRepository.findOne({
        where: { idempotencyKey, userId },
      });
      if (existing) return existing;
    }

    const vault = await this.vaultRepository.findOne({ where: { id: vaultId } });
    if (!vault) throw new NotFoundException('Vault not found');
    if (vault.status !== VaultStatus.ACTIVE) {
      throw new BadRequestException('Vault is not active for deposits');
    }

    const deposit = this.depositRepository.create({
      userId,
      vaultId,
      amount,
      status: DepositStatus.PENDING,
      idempotencyKey: idempotencyKey || null,
    });

    const result = await this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(deposit);
      await manager.increment(Vault, { id: vaultId }, 'totalDeposits', amount);
      const updatedVault = await manager.findOne(Vault, { where: { id: vaultId } });
      return { saved, updatedVault };
    });

    // mark confirmed immediately in this simplified example
    await this.depositRepository.update(result.saved.id, {
      status: DepositStatus.CONFIRMED,
      confirmedAt: new Date(),
      transactionHash: `tx_${Date.now()}`,
    });

    // emit domain event for projections
    this.eventBus.publish(new VaultCreditedEvent(vaultId, userId, amount));

    // optional notification
    if (amount >= 10000) {
      await this.notificationsService.create({
        title: 'Large Deposit Alert',
        message: `Large deposit of ${amount} to vault ${vault.vaultName}`,
        type: NotificationType.LARGE_TRANSACTION,
        adminOnly: true,
      });
    }

    return result.saved;
  }
}
