"use client";

import { create } from 'zustand';
import freighterApi, { isConnected, getAddress } from '@stellar/freighter-api';

export interface TokenBalance {
  symbol: string;
  balance: string;
  usdValue?: number;
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isRefreshing: boolean;
  error: string | null;
  balances: TokenBalance[];
  totalValueUsd: number;

  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
  getXlmBalance: () => number;
  getTokenBalance: (symbol: string) => number;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  isRefreshing: false,
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
          error: "Freighter wallet not found. Please install the extension.",
        });
        return;
      }

      // Try named export first, fallback to default if needed (though named is standard for freighter-api)
      const publicKeyResult = await getAddress();

      if (publicKeyResult.error) {
        set({
          isConnecting: false,
          error: publicKeyResult.error,
        });
        return;
      }

      set({
        address: publicKeyResult.address,
        isConnected: true,
        isConnecting: false,
        error: null,
      });

      get().refreshBalances();
    } catch (err) {
      set({
        isConnecting: false,
        error: err instanceof Error ? err.message : "Failed to connect wallet",
      });
    }
  },

  disconnect: () => {
    set({
      address: null,
      isConnected: false,
      isConnecting: false,
      isRefreshing: false,
      error: null,
      balances: [],
      totalValueUsd: 0,
    });
  },

  refreshBalances: async () => {
    const { address } = get();
    if (!address) return;

    set({ isRefreshing: true });

    try {
      const mockBalances: TokenBalance[] = [
        { symbol: "XLM", balance: "1,250.45", usdValue: 156.31 },
        { symbol: "USDC", balance: "500.00", usdValue: 500.0 },
        { symbol: "yUSDC", balance: "250.00", usdValue: 262.5 },
      ];

      const total = mockBalances.reduce((sum, b) => sum + (b.usdValue || 0), 0);

      set({
        balances: mockBalances,
        totalValueUsd: total,
        isRefreshing: false,
      });
    } catch (err) {
      set({ isRefreshing: false });
      throw err;
    }
  },

  getXlmBalance: () => {
    const xlm = get().balances.find((b) => b.symbol === "XLM");
    return xlm ? parseFloat(xlm.balance.replace(/,/g, "")) || 0 : 0;
  },

  getTokenBalance: (symbol: string) => {
    const token = get().balances.find((b) => b.symbol === symbol);
    return token ? parseFloat(token.balance.replace(/,/g, "")) || 0 : 0;
  },
}));

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
