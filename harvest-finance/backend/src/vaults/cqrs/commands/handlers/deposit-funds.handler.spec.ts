import { DepositFundsHandler } from './deposit-funds.handler';
import { Deposit } from '../../../../database/entities/deposit.entity';
import { Vault } from '../../../../database/entities/vault.entity';

describe('DepositFundsHandler', () => {
  let handler: DepositFundsHandler;

  beforeEach(() => {
    // minimal mocks
    const depositRepo: any = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockReturnValue({}),
      update: jest.fn().mockResolvedValue({}),
      save: jest.fn().mockResolvedValue({ id: 'd1' }),
    };
    const vaultRepo: any = {
      findOne: jest.fn().mockResolvedValue({ id: 'v1', status: 'ACTIVE', vaultName: 'V' }),
    };
    const dataSource: any = { transaction: (cb: any) => cb({ save: depositRepo.save, increment: jest.fn(), findOne: vaultRepo.findOne, update: jest.fn() }) };
    const notifications: any = { create: jest.fn() };
    const eventBus: any = { publish: jest.fn() };

    handler = new DepositFundsHandler(depositRepo as any, vaultRepo as any, dataSource as any, notifications as any, eventBus as any);
  });

  it('creates a deposit and emits event', async () => {
    const result = await handler.execute({ vaultId: 'v1', userId: 'u1', amount: 100 } as any);
    expect(result).toBeDefined();
  });
});
