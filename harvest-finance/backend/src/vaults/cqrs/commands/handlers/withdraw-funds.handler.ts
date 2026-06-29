import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { WithdrawFundsCommand } from '../withdraw-funds.command';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Withdrawal, WithdrawalStatus } from '../../../../database/entities/withdrawal.entity';
import { Vault, VaultStatus } from '../../../../database/entities/vault.entity';
import { VaultDebitedEvent } from '../../events/vault-debited.event';
import { BadRequestException, NotFoundException } from '@nestjs/common';

@CommandHandler(WithdrawFundsCommand)
export class WithdrawFundsHandler implements ICommandHandler<WithdrawFundsCommand> {
  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(Vault)
    private readonly vaultRepository: Repository<Vault>,
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: WithdrawFundsCommand) {
    const { vaultId, userId, amount } = command;

    if (amount <= 0) throw new BadRequestException('Withdrawal amount must be > 0');

    const vault = await this.vaultRepository.findOne({ where: { id: vaultId } });
    if (!vault) throw new NotFoundException('Vault not found');
    if (vault.status === VaultStatus.FROZEN) {
      throw new BadRequestException('Vault is frozen');
    }

    const isQueued = amount > Number(vault.totalDeposits);

    const withdrawal = this.withdrawalRepository.create({
      userId,
      vaultId,
      amount,
      status: isQueued ? WithdrawalStatus.QUEUED : WithdrawalStatus.PENDING,
      queuedAt: isQueued ? new Date() : null,
    });

    const result = await this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(withdrawal);
      if (!isQueued) {
        await manager.decrement(Vault, { id: vaultId }, 'totalDeposits', amount);
      }
      const updatedVault = await manager.findOne(Vault, { where: { id: vaultId } });
      return { saved, updatedVault };
    });

    if (!isQueued) {
      this.eventBus.publish(new VaultDebitedEvent(vaultId, userId, amount));
    }

    return result.saved;
  }
}
