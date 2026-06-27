export * from './deposit-funds.handler';
export * from './withdraw-funds.handler';

import { DepositFundsHandler } from './deposit-funds.handler';
import { WithdrawFundsHandler } from './withdraw-funds.handler';

export const CommandHandlers = [DepositFundsHandler, WithdrawFundsHandler];
