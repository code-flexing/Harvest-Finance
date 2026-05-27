import { ReactNode } from 'react';

export type RiskLevel = 'Low' | 'Medium' | 'High';
export type StrategyType = 'Audited' | 'Community' | 'Experimental';

export interface Vault {
  id: string;
  name: string;
  asset: string;
  apy: number; // e.g., 8.5
  tvl: number; // e.g., 12400000
  riskLevel: RiskLevel;
  balance: string; // Current user balance
  walletBalance: string; // User's wallet balance
  icon?: ReactNode;
  iconName?: string; // For dynamic loading or references
  seasonalTarget: number;
  strategyType?: StrategyType;
  projections?: {
    progressPercentage: number;
  };
  shares?: number | string;   // User's current vault shares
  totalAssets?: number;       // Total assets in vault (for share estimation)
  totalShares?: number;       // Total shares issued (for share estimation)
  description?: string;       // Detailed strategy description
}

