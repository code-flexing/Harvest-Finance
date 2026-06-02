import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Connection } from '@solana/web3.js';
import { User } from '../../database/entities/user.entity';
import { SolanaYieldAdapter } from './solana-yield.adapter';

jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn(),
  PublicKey: jest.fn((key: string) => ({
    toBase58: () => key,
    toString: () => key,
  })),
}));

describe('SolanaYieldAdapter', () => {
  const strategies = JSON.stringify([
    {
      mint: 'USDCmint',
      name: 'USDC Yield Vault',
      assetCode: 'USDC',
      apr: 10,
    },
  ]);

  const buildUsers = (
    user: Partial<User> | null,
  ): Repository<User> =>
    ({
      findOne: () => Promise.resolve(user),
    }) as unknown as Repository<User>;

  const buildConfig = (overrides: Record<string, string | undefined> = {}) =>
    ({
      get: (key: string) => {
        const values: Record<string, string | undefined> = {
          SOLANA_RPC_URL: 'https://api.devnet.solana.com',
          SOLANA_VAULT_STRATEGIES: strategies,
          ...overrides,
        };
        return values[key];
      },
    }) as unknown as ConfigService;

  const mockRpc = (accounts: Array<{ mint: string; uiAmount: string }>) => {
    (Connection as jest.Mock).mockImplementation(() => ({
      getParsedTokenAccountsByOwner: jest.fn().mockResolvedValue({
        value: accounts.map((a, i) => ({
          pubkey: {
            toBase58: () =>
              `TokenAcc${i}111111111111111111111111111111111111111`,
          },
          account: {
            data: {
              parsed: {
                type: 'account',
                info: {
                  mint: a.mint,
                  tokenAmount: { uiAmountString: a.uiAmount },
                },
              },
            },
          },
        })),
      }),
    }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns SPL vault positions for a linked wallet', async () => {
    mockRpc([{ mint: 'USDCmint', uiAmount: '250.5' }]);

    const adapter = new SolanaYieldAdapter(
      buildUsers({
        id: 'user-1',
        solanaAddress: 'So11111111111111111111111111111111111111112',
      } as User),
      buildConfig(),
    );

    const result = await adapter.getYieldsForUser('user-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      chain: 'solana',
      positionName: 'USDC Yield Vault',
      principal: '250.5000000',
      asset: { code: 'USDC', issuer: 'USDCmint' },
      apr: 10,
      estimatedAnnualYield: '25.0500000',
    });
    expect(result[0].positionId).toContain('USDCmint:');
  });

  it('returns [] when the user has no solana address', async () => {
    const adapter = new SolanaYieldAdapter(
      buildUsers({ id: 'user-2', solanaAddress: null } as User),
      buildConfig(),
    );

    expect(await adapter.getYieldsForUser('user-2')).toEqual([]);
    expect(Connection).not.toHaveBeenCalled();
  });

  it('returns [] when RPC URL is not configured', async () => {
    const adapter = new SolanaYieldAdapter(
      buildUsers({
        id: 'user-3',
        solanaAddress: 'So11111111111111111111111111111111111111112',
      } as User),
      buildConfig({ SOLANA_RPC_URL: undefined }),
    );

    expect(await adapter.getYieldsForUser('user-3')).toEqual([]);
  });

  it('returns [] when vault strategies are not configured', async () => {
    const adapter = new SolanaYieldAdapter(
      buildUsers({
        id: 'user-4',
        solanaAddress: 'So11111111111111111111111111111111111111112',
      } as User),
      buildConfig({ SOLANA_VAULT_STRATEGIES: undefined }),
    );

    expect(await adapter.getYieldsForUser('user-4')).toEqual([]);
  });

  it('returns [] when the RPC call fails', async () => {
    (Connection as jest.Mock).mockImplementation(() => ({
      getParsedTokenAccountsByOwner: jest
        .fn()
        .mockRejectedValue(new Error('RPC down')),
    }));

    const adapter = new SolanaYieldAdapter(
      buildUsers({
        id: 'user-5',
        solanaAddress: 'So11111111111111111111111111111111111111112',
      } as User),
      buildConfig(),
    );

    expect(await adapter.getYieldsForUser('user-5')).toEqual([]);
  });

  it('returns [] when users.findOne throws', async () => {
    const adapter = new SolanaYieldAdapter(
      {
        findOne: () => Promise.reject(new Error('db failure')),
      } as unknown as Repository<User>,
      buildConfig(),
    );

    expect(await adapter.getYieldsForUser('user-6')).toEqual([]);
  });
});
