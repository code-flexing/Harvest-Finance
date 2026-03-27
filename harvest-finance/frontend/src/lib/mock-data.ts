
export type TransactionType = 'Deposit' | 'Withdraw' | 'Reward';
export type TransactionStatus = 'Completed' | 'Pending' | 'Failed';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  vault: string;
  amount: string;
  token: string;
  status: TransactionStatus;
}

export interface PortfolioStats {
  totalDeposited: string;
  totalRewards: string;
  portfolioValue: string;
  change24h: string;
}

export const MOCK_STATS: PortfolioStats = {
  totalDeposited: '$12,450.00',
  totalRewards: '$842.50',
  portfolioValue: '$13,292.50',
  change24h: '+2.4%',
};

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    date: '2024-03-24',
    type: 'Deposit',
    vault: 'USDC-DAI LP',
    amount: '1,200.00',
    token: 'USDC',
    status: 'Completed',
  },
  {
    id: '2',
    date: '2024-03-22',
    type: 'Reward',
    vault: 'ETH-Staking',
    amount: '0.045',
    token: 'ETH',
    status: 'Completed',
  },
  {
    id: '3',
    date: '2024-03-20',
    type: 'Withdraw',
    vault: 'WBTC-Vault',
    amount: '0.12',
    token: 'WBTC',
    status: 'Completed',
  },
  {
    id: '4',
    date: '2024-03-18',
    type: 'Deposit',
    vault: 'USDT-Vault',
    amount: '500.00',
    token: 'USDT',
    status: 'Pending',
  },
  {
    id: '5',
    date: '2024-03-15',
    type: 'Reward',
    vault: 'FARM-Staking',
    amount: '12.5',
    token: 'FARM',
    status: 'Completed',
  },
  {
    id: '6',
    date: '2024-03-12',
    type: 'Deposit',
    vault: 'LINK-Vault',
    amount: '100.00',
    token: 'LINK',
    status: 'Failed',
  },
];
