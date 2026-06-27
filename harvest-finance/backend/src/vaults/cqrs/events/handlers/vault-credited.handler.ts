import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { VaultCreditedEvent } from '../vault-credited.event';
import { VaultReadRepository } from '../../../read/vault-read.repository';

@EventsHandler(VaultCreditedEvent)
export class VaultCreditedHandler implements IEventHandler<VaultCreditedEvent> {
  constructor(private readonly readRepo: VaultReadRepository) {}

  async handle(event: VaultCreditedEvent) {
    // update projections / read model
    await this.readRepo.incrementBalance(event.vaultId, event.amount);
  }
}
