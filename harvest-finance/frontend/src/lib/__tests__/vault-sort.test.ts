
import { Vault } from '@/types/vault';
import { sortVaults } from '../vault-utils';

const mockVaults: Vault[] = [
  {
    id: '1',
    name: 'B Vault',
    asset: 'USDC',
    apy: 10,
    tvl: 1000,
    riskLevel: 'Medium',
    balance: '0',
    walletBalance: '0',
    seasonalTarget: 1000,
  },
  {
    id: '2',
    name: 'A Vault',
    asset: 'USDC',
    apy: 5,
    tvl: 2000,
    riskLevel: 'Low',
    balance: '0',
    walletBalance: '0',
    seasonalTarget: 1000,
  },
  {
    id: '3',
    name: 'C Vault',
    asset: 'USDC',
    apy: 15,
    tvl: 500,
    riskLevel: 'High',
    balance: '0',
    walletBalance: '0',
    seasonalTarget: 1000,
  },
];

describe('vault-utils', () => {
  describe('sortVaults', () => {
    it('should sort by name ascending', () => {
      const sorted = sortVaults(mockVaults, 'name', 'asc');
      expect(sorted[0].name).toBe('A Vault');
      expect(sorted[2].name).toBe('C Vault');
    });

    it('should sort by apy descending', () => {
      const sorted = sortVaults(mockVaults, 'apy', 'desc');
      expect(sorted[0].apy).toBe(15);
      expect(sorted[2].apy).toBe(5);
    });

    it('should sort by tvl ascending', () => {
      const sorted = sortVaults(mockVaults, 'tvl', 'asc');
      expect(sorted[0].tvl).toBe(500);
      expect(sorted[2].tvl).toBe(2000);
    });

    it('should sort by riskLevel ascending (Low < Medium < High)', () => {
      const sorted = sortVaults(mockVaults, 'riskLevel', 'asc');
      expect(sorted[0].riskLevel).toBe('Low');
      expect(sorted[1].riskLevel).toBe('Medium');
      expect(sorted[2].riskLevel).toBe('High');
    });

    it('should handle edge cases like missing or null data gracefully by using defaults', () => {
      const incompleteVaults: Vault[] = [
        ...mockVaults,
        {
          id: '4',
          name: 'D Vault',
          asset: 'USDC',
          apy: undefined as any,
          tvl: null as any,
          riskLevel: 'Low',
          balance: '0',
          walletBalance: '0',
          seasonalTarget: 1000,
        },
      ];
      const sorted = sortVaults(incompleteVaults, 'apy', 'asc');
      expect(sorted[0].id).toBe('4'); // undefined/null treated as 0
    });
  });
});
