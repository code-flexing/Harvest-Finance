'use client';

import React from 'react';
import { useWalletStore, TokenBalance } from '@/store/wallet';
import { Card, CardHeader, CardBody, Badge, Tooltip } from '@/components/ui';
import { useToastStore } from '@/store/useToastStore';
import { Info } from 'lucide-react';
import { getTermTooltip } from '@/lib/defi-terms';

export function BalanceDisplay() {
  const { isConnected, balances, totalValueUsd, refreshBalances, isRefreshing } = useWalletStore();
  const { showToast } = useToastStore();

  const handleRefresh = async () => {
    try {
      await refreshBalances();
      showToast('Balances updated successfully', 'success');
    } catch (error) {
      showToast('Failed to refresh balances', 'error');
    }
  };

  if (!isConnected) {
    return (
      <Card variant="outlined" padding="md">
        <div className="text-center py-6">
          <WalletIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" aria-hidden="true" />
          <p className="text-gray-500 text-sm">Connect your wallet to view balances</p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="default" padding="none">
      <CardHeader
        title={
          <Tooltip content={getTermTooltip('trustlines')} position="bottom">
            <span className="flex items-center gap-1 cursor-help">
              Portfolio
              <Info className="w-4 h-4 opacity-60" />
            </span>
          </Tooltip>
        }
        subtitle="Your token balances"
        className="p-4 border-b border-gray-100"
        action={
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-harvest-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh balances"
            aria-label={isRefreshing ? 'Refreshing balances...' : 'Refresh balances'}
          >
            <RefreshIcon isRefreshing={isRefreshing} />
          </button>
        }
      />
      <CardBody className="p-4">
        {/* Total Value */}
        <div className="mb-4 p-4 bg-gradient-to-r from-harvest-green-50 to-emerald-50 rounded-xl">
          <p className="text-sm text-gray-600 mb-1">Total Value</p>
          <p className="text-2xl font-bold text-harvest-green-700">
            ${totalValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Token List */}
        <div className="space-y-3" role="list" aria-label="Token balances">
          {balances.map((token) => (
            <TokenRow key={token.symbol} token={token} />
          ))}
        </div>

        {balances.length === 0 && !isRefreshing && (
          <p className="text-center text-gray-400 py-4 text-sm" role="status">
            No tokens found
          </p>
        )}

        {isRefreshing && (
          <div className="text-center py-4" role="status" aria-live="polite">
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <RefreshIcon isRefreshing={true} />
              Refreshing balances...
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function TokenRow({ token }: { token: TokenBalance }) {
  return (
    <div
      className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors"
      role="listitem"
      aria-label={`${token.symbol} balance: ${token.balance}`}
    >
      <div className="flex items-center gap-3">
        <TokenIcon symbol={token.symbol} />
        <div>
          <p className="font-medium text-gray-800">{token.symbol}</p>
          {token.usdValue !== undefined && (
            <p className="text-xs text-gray-500">
              ${token.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono font-medium text-gray-800">{token.balance}</p>
      </div>
    </div>
  );
}

function TokenIcon({ symbol }: { symbol: string }) {
  const colors: Record<string, string> = {
    XLM: 'bg-blue-500',
    USDC: 'bg-blue-600',
    yUSDC: 'bg-harvest-green-500',
    default: 'bg-gray-400',
  };

  const bgColor = colors[symbol] || colors.default;

  return (
    <div className={`w-8 h-8 ${bgColor} rounded-full flex items-center justify-center`}>
      <span className="text-white text-xs font-bold">
        {symbol.slice(0, 2)}
      </span>
    </div>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function RefreshIcon({ isRefreshing = false }: { isRefreshing?: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
