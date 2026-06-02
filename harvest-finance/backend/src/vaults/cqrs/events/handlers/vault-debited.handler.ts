import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { VaultDebitedEvent } from '../vault-debited.event';
import { VaultReadRepository } from '../../../read/vault-read.repository';

@EventsHandler(VaultDebitedEvent)
export class VaultDebitedHandler implements IEventHandler<VaultDebitedEvent> {
  constructor(private readonly readRepo: VaultReadRepository) {}

  async handle(event: VaultDebitedEvent) {
    await this.readRepo.decrementBalance(event.vaultId, event.amount);
  }
}
