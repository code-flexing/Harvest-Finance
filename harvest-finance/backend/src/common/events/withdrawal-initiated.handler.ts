import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WithdrawalInitiatedEvent } from '../../domain-events/events/withdrawal-initiated.event';
import { DomainEventNames } from '../../domain-events/domain-event-names';

@Injectable()
export class WithdrawalInitiatedHandler {
  private readonly logger = new Logger(WithdrawalInitiatedHandler.name);

  @OnEvent(DomainEventNames.WITHDRAWAL_INITIATED, { async: true })
  async handle(event: WithdrawalInitiatedEvent): Promise<void> {
    try {
      this.logger.log(
        `Withdrawal initiated: id=${event.withdrawalId} user=${event.userId} vault=${event.vaultId} amount=${event.amount} vault="${event.vaultName}"`,
      );
      // Future: trigger compliance checks, on-chain escrow release
    } catch (error) {
      this.logger.error(
        `Error handling WithdrawalInitiatedEvent for withdrawal ${event.withdrawalId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
