import { MultiChainService } from './multi-chain.service';
import { ChainAdapter, ChainYield } from './interfaces/chain-adapter.interface';

const makeYield = (chain: string, id: string): ChainYield => ({
  chain,
  positionId: id,
  positionName: `${chain} pos ${id}`,
  principal: '100.0000000',
  asset: { code: 'XLM', issuer: null },
  apr: 5,
  estimatedAnnualYield: '5.0000000',
});

describe('MultiChainService', () => {
  it('aggregates positions from every adapter in parallel', async () => {
    const adapters: ChainAdapter[] = [
      {
        chain: 'stellar',
        getYieldsForUser: jest
          .fn()
          .mockResolvedValue([makeYield('stellar', 'v1')]),
      },
      {
        chain: 'ethereum',
        getYieldsForUser: jest
          .fn()
          .mockResolvedValue([makeYield('ethereum', '0xabc')]),
      },
    ];
    const service = new MultiChainService(adapters);

    const result = await service.getCrossChainYields('user-1');

    expect(result.userId).toBe('user-1');
    expect(result.chainsQueried).toEqual(['stellar', 'ethereum']);
    expect(result.positions).toHaveLength(2);
    expect(result.positions.map((p) => p.chain).sort()).toEqual([
      'ethereum',
      'stellar',
    ]);
    expect(result.errors).toEqual([]);
  });

  it('records failures under errors and still returns successful adapters', async () => {
    const adapters: ChainAdapter[] = [
      {
        chain: 'stellar',
        getYieldsForUser: jest
          .fn()
          .mockResolvedValue([makeYield('stellar', 'v1')]),
      },
      {
        chain: 'ethereum',
        getYieldsForUser: jest.fn().mockRejectedValue(new Error('RPC down')),
      },
    ];
    const service = new MultiChainService(adapters);

    const result = await service.getCrossChainYields('user-2');

    expect(result.positions).toHaveLength(1);
    expect(result.positions[0].chain).toBe('stellar');
    expect(result.errors).toEqual([{ chain: 'ethereum', message: 'RPC down' }]);
  });

  it('returns an empty position list when no adapters are registered', async () => {
    const service = new MultiChainService([]);
    const result = await service.getCrossChainYields('user-3');

    expect(result.positions).toEqual([]);
    expect(result.chainsQueried).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});
