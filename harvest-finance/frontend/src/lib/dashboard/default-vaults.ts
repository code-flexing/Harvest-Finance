import type { StoredVault } from '@/lib/offline/db';

export const DASHBOARD_DEFAULT_VAULTS: StoredVault[] = [
  {
    id: '1',
    name: 'Stellar USDC Yield',
    asset: 'USDC',
    apy: '8.5%',
    tvl: '$12.4M',
    balance: '1250.00',
    walletBalance: '5000.00',
    iconKey: 'coins',
  },
  {
    id: '2',
    name: 'XLM Alpha Vault',
    asset: 'XLM',
    apy: '12.2%',
    tvl: '$8.1M',
    balance: '0.00',
    walletBalance: '12,450.00',
    iconKey: 'zap',
  },
  {
    id: '3',
    name: 'Eco-Farm Governance',
    asset: 'HRVST',
    apy: '24.5%',
    tvl: '$4.2M',
    balance: '450.00',
    walletBalance: '1,200.00',
    iconKey: 'leaf',
  },
  {
    id: '4',
    name: 'Stable-Harvest Plus',
    asset: 'yUSDC',
    apy: '6.8%',
    tvl: '$25.9M',
    balance: '10000.00',
    walletBalance: '2500.00',
    iconKey: 'shield',
  },
];
