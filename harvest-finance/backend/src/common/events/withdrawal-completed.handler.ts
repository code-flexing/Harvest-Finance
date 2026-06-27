import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WithdrawalCompletedEvent } from '../../domain-events/events/withdrawal-completed.event';
import { DomainEventNames } from '../../domain-events/domain-event-names';

@Injectable()
export class WithdrawalCompletedHandler {
  private readonly logger = new Logger(WithdrawalCompletedHandler.name);

  @OnEvent(DomainEventNames.WITHDRAWAL_COMPLETED, { async: true })
  async handle(event: WithdrawalCompletedEvent): Promise<void> {
    try {
      this.logger.log(
        `Withdrawal completed: id=${event.withdrawalId} user=${event.userId} vault=${event.vaultId} amount=${event.amount} newBalance=${event.newBalance}`,
      );
      // Future: update user balance cache, trigger post-withdrawal notifications
    } catch (error) {
      this.logger.error(
        `Error handling WithdrawalCompletedEvent for withdrawal ${event.withdrawalId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
