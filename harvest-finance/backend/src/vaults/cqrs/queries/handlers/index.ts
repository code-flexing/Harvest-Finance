export * from './get-vault-balance.handler';
export * from './get-vault-transactions.handler';

import { GetVaultBalanceHandler } from './get-vault-balance.handler';
import { GetVaultTransactionsHandler } from './get-vault-transactions.handler';

export const QueryHandlers = [GetVaultBalanceHandler, GetVaultTransactionsHandler];
