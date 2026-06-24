import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { VaultCreatedEvent } from '../../domain-events/events/vault-created.event';
import { DomainEventNames } from '../../domain-events/domain-event-names';

@Injectable()
export class VaultCreatedHandler {
  private readonly logger = new Logger(VaultCreatedHandler.name);

  @OnEvent(DomainEventNames.VAULT_CREATED, { async: true })
  async handle(event: VaultCreatedEvent): Promise<void> {
    try {
      this.logger.log(
        `Vault created: id=${event.vaultId} name="${event.vaultName}" owner=${event.ownerId} type=${event.vaultType} capacity=${event.maxCapacity}`,
      );
      // Future: trigger downstream workflows (e.g. notify admins, provision on-chain contract)
    } catch (error) {
      this.logger.error(
        `Error handling VaultCreatedEvent for vault ${event.vaultId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
