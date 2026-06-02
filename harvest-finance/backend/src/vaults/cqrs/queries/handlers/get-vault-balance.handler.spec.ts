import { GetVaultBalanceHandler } from './get-vault-balance.handler';
import { VaultReadRepository } from '../../../read/vault-read.repository';

describe('GetVaultBalanceHandler', () => {
  let handler: GetVaultBalanceHandler;

  beforeEach(() => {
    const readRepo: any = { getBalance: jest.fn().mockResolvedValue(123) };
    handler = new GetVaultBalanceHandler(readRepo as VaultReadRepository);
  });

  it('returns balance from read repository', async () => {
    const result = await handler.execute({ vaultId: 'v1' } as any);
    expect(result).toEqual(123);
  });
});
