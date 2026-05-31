import { Repository } from 'typeorm';
import { StellarYieldAdapter } from './stellar-yield.adapter';
import { Deposit } from '../../database/entities/deposit.entity';
import { Vault, VaultType } from '../../database/entities/vault.entity';

describe('StellarYieldAdapter', () => {
  const buildDeposits = (
    rows: Array<{ vaultId: string; principal: string }>,
  ): Repository<Deposit> =>
    ({
      createQueryBuilder: () => ({
        select: () => ({
          addSelect: () => ({
            where: () => ({
              andWhere: () => ({
                groupBy: () => ({
                  getRawMany: () => Promise.resolve(rows),
                }),
              }),
            }),
          }),
        }),
      }),
    }) as unknown as Repository<Deposit>;

  const buildVaults = (
    vaults: Array<{
      id: string;
      vaultName: string;
      type: VaultType;
      interestRate: number;
    }>,
  ): Repository<Vault> =>
    ({
      find: () => Promise.resolve(vaults),
    }) as unknown as Repository<Vault>;

  it('returns one ChainYield per confirmed-deposit vault', async () => {
    const adapter = new StellarYieldAdapter(
      buildDeposits([
        { vaultId: 'v1', principal: '1500' },
        { vaultId: 'v2', principal: '500' },
      ]),
      buildVaults([
        {
          id: 'v1',
          vaultName: 'Maize Vault',
          type: VaultType.CROP_PRODUCTION,
          interestRate: 7.5,
        },
        {
          id: 'v2',
          vaultName: 'Equipment Fund',
          type: VaultType.EQUIPMENT_FINANCING,
          interestRate: 10,
        },
      ]),
    );

    const result = await adapter.getYieldsForUser('user-1');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      chain: 'stellar',
      positionId: 'v1',
      positionName: 'Maize Vault',
      principal: '1500.0000000',
      asset: { code: 'XLM', issuer: null },
      apr: 7.5,
      estimatedAnnualYield: '112.5000000',
    });
    expect(result[1]).toMatchObject({
      positionId: 'v2',
      principal: '500.0000000',
      apr: 10,
      estimatedAnnualYield: '50.0000000',
    });
  });

  it('returns [] when the user has no confirmed deposits', async () => {
    const adapter = new StellarYieldAdapter(buildDeposits([]), buildVaults([]));
    expect(await adapter.getYieldsForUser('lonely-user')).toEqual([]);
  });

  it('falls back gracefully when a vault row is missing', async () => {
    const adapter = new StellarYieldAdapter(
      buildDeposits([{ vaultId: 'orphan', principal: '42' }]),
      buildVaults([]),
    );

    const result = await adapter.getYieldsForUser('user-2');
    expect(result[0].positionName).toBe('Unknown Vault');
    expect(result[0].apr).toBeNull();
    expect(result[0].estimatedAnnualYield).toBeNull();
  });

  it('returns [] when deposits query throws', async () => {
    const badDeposits = {
      createQueryBuilder: () => ({
        select: () => ({
          addSelect: () => ({
            where: () => ({
              andWhere: () => ({
                groupBy: () => ({
                  getRawMany: () => Promise.reject(new Error('db failure')),
                }),
              }),
            }),
          }),
        }),
      }),
    } as unknown as Repository<Deposit>;

    const adapter = new StellarYieldAdapter(badDeposits, buildVaults([]));
    const result = await adapter.getYieldsForUser('user-error');
    expect(result).toEqual([]);
  });

  it('returns [] when vaults.find throws', async () => {
    const adapter = new StellarYieldAdapter(
      buildDeposits([{ vaultId: 'v1', principal: '100' }]),
      {
        find: () => Promise.reject(new Error('network')),
      } as unknown as Repository<Vault>,
    );

    const result = await adapter.getYieldsForUser('user-2');
    expect(result).toEqual([]);
  });
});
