export * from './vault-credited.handler';
export * from './vault-debited.handler';

import { VaultCreditedHandler } from './vault-credited.handler';
import { VaultDebitedHandler } from './vault-debited.handler';

export const EventHandlers = [VaultCreditedHandler, VaultDebitedHandler];
