import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationHelper } from '../../notifications/notification.helper';
import { CustomLoggerService } from '../../logger/custom-logger.service';
import { VaultGateway } from '../../realtime/vault.gateway';
import {
  DomainEventNames,
  WithdrawalCompletedEvent,
  WithdrawalConfirmedEvent,
} from '../../domain-events';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class WithdrawalConfirmedHandler {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly logger: CustomLoggerService,
    private readonly vaultGateway: VaultGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(DomainEventNames.WITHDRAWAL_CONFIRMED, { async: true })
  async handle(event: WithdrawalConfirmedEvent): Promise<void> {
    await this.notificationsService.create(
      NotificationHelper.withdrawalConfirmed({
        userId: event.userId,
        amount: event.amount,
        vaultName: event.vaultName,
      }),
    );

    this.logger.log(
      `Withdrawal of ${event.amount} confirmed from vault ${event.vaultId} by user ${event.userId}`,
      'WithdrawalConfirmedHandler',
    );

    this.vaultGateway.emitWithdrawal({
      vaultId: event.vaultId,
      vaultName: event.vaultName,
      amount: event.amount,
      userId: event.userId,
      newBalance: event.newBalance,
    });

    // Keep existing domain event for downstream consumers.
    this.eventEmitter.emit(
      DomainEventNames.WITHDRAWAL_COMPLETED,
      new WithdrawalCompletedEvent(
        event.withdrawalId,
        event.userId,
        event.vaultId,
        event.amount,
        event.vaultName,
        event.newBalance,
      ),
    );
  }
}

