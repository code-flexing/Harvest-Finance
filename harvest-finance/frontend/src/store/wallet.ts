'use client';

import { create } from 'zustand';
import { isConnected, getAddress } from '@stellar/freighter-api';

export interface TokenBalance {
  symbol: string;
  balance: string;
  usdValue?: number;
}

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  balances: TokenBalance[];
  totalValueUsd: number;

  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  balances: [],
  totalValueUsd: 0,

  connect: async () => {
    set({ isConnecting: true, error: null });

    try {
      const connected = await isConnected();

      if (!connected.isConnected) {
        set({
          isConnecting: false,
          error: 'Freighter wallet not found. Please install the extension.'
        });
        return;
      }

      const addressResult = await getAddress();

      if (addressResult.error) {
        set({
          isConnecting: false,
          error: String(addressResult.error),
        });
        return;
      }

      set({
        address: addressResult.address,
        isConnected: true,
        isConnecting: false,
        error: null
      });

      // Fetch balances after connecting
      get().refreshBalances();

    } catch (err) {
      set({
        isConnecting: false,
        error: err instanceof Error ? err.message : 'Failed to connect wallet'
      });
    }
  },

  disconnect: () => {
    set({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      balances: [],
      totalValueUsd: 0
    });
  },

  refreshBalances: async () => {
    const { address } = get();
    if (!address) return;

    try {
      // Mock balances for demo - in production, fetch from Stellar Horizon API
      const mockBalances: TokenBalance[] = [
        { symbol: 'XLM', balance: '1,250.45', usdValue: 156.31 },
        { symbol: 'USDC', balance: '500.00', usdValue: 500.00 },
        { symbol: 'yUSDC', balance: '250.00', usdValue: 262.50 },
      ];

      const total = mockBalances.reduce((sum, b) => sum + (b.usdValue || 0), 0);

      set({
        balances: mockBalances,
        totalValueUsd: total
      });
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    }
  },
}));

// Utility to shorten address for display
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
