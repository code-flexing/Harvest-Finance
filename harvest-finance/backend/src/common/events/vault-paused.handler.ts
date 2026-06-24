import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { VaultPausedEvent } from '../../domain-events/events/vault-paused.event';
import { DomainEventNames } from '../../domain-events/domain-event-names';

@Injectable()
export class VaultPausedHandler {
  private readonly logger = new Logger(VaultPausedHandler.name);

  @OnEvent(DomainEventNames.VAULT_PAUSED, { async: true })
  async handle(event: VaultPausedEvent): Promise<void> {
    try {
      this.logger.log(
        `Vault paused: id=${event.vaultId} name="${event.vaultName}" by user=${event.pausedByUserId}`,
      );
      // Future: notify depositors, halt pending transactions
    } catch (error) {
      this.logger.error(
        `Error handling VaultPausedEvent for vault ${event.vaultId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
