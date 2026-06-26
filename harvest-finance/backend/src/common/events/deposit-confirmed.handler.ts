import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DepositConfirmedEvent } from '../../domain-events/events/deposit-confirmed.event';
import { DomainEventNames } from '../../domain-events/domain-event-names';

@Injectable()
export class DepositConfirmedHandler {
  private readonly logger = new Logger(DepositConfirmedHandler.name);

  @OnEvent(DomainEventNames.DEPOSIT_CONFIRMED, { async: true })
  async handle(event: DepositConfirmedEvent): Promise<void> {
    try {
      this.logger.log(
        `Deposit confirmed: id=${event.depositId} user=${event.userId} vault=${event.vaultId} amount=${event.amount} txHash=${event.transactionHash}`,
      );
      // Future: update yield analytics, trigger reward distribution
    } catch (error) {
      this.logger.error(
        `Error handling DepositConfirmedEvent for deposit ${event.depositId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
