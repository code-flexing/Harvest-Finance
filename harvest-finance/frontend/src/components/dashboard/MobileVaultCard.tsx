'use client';

import React, { useCallback } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  PiggyBank, 
  Leaf,
  Clock,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react';
import { Badge, Card, CardBody, Tooltip } from '@/components/ui';
import { Info } from 'lucide-react';
import { getTermTooltip } from '@/lib/defi-terms';

interface MobileVaultCardProps {
  id: string;
  name: string;
  asset: string;
  apy: string;
  tvl: string;
  balance: string;
  walletBalance: string;
  progress?: number;
  cropType?: string;
  status?: 'active' | 'pending' | 'completed';
  lastUpdated?: string;
  isCached?: boolean;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onClick?: () => void;
}

export function MobileVaultCard({
  id,
  name,
  asset,
  apy,
  tvl,
  balance,
  walletBalance,
  progress,
  cropType,
  status = 'active',
  lastUpdated,
  isCached = false,
  onDeposit,
  onWithdraw,
  onClick,
}: MobileVaultCardProps) {
  const handleDeposit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDeposit?.();
  }, [onDeposit]);

  const handleWithdraw = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onWithdraw?.();
  }, [onWithdraw]);

  return (
    <Card 
      variant="default" 
      className="cursor-pointer active:scale-[0.98] transition-transform touch-manipulation"
      onClick={onClick}
    >
      <CardBody className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-harvest-green-50 text-harvest-green-700">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="primary" size="sm" isPill>
                  {asset}
                </Badge>
                <span className="text-xs text-gray-500">{cropType}</span>
              </div>
            </div>
          </div>
          
          <button 
            className="p-2 -mr-2 rounded-lg text-gray-400 hover:text-gray-600 active:bg-gray-100 touch-manipulation"
            onClick={(e) => {
              e.stopPropagation();
            }}
            aria-label="More options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Vault Balance</p>
            <p className="text-xl font-bold text-gray-900">{balance}</p>
          </div>
          <div className="text-right">
            <Tooltip content={getTermTooltip('apy')} position="top">
              <div className="cursor-help">
                <p className="text-xs text-gray-500 mb-1 flex items-center justify-end gap-1">
                  APY
                  <Info className="w-3 h-3 opacity-60" />
                </p>
                <p className="text-lg font-semibold text-harvest-green-600">{apy}</p>
              </div>
            </Tooltip>
          </div>
        </div>

        {typeof progress === 'number' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Progress to target</span>
              <span className="font-medium text-gray-700">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-harvest-green-400 to-harvest-green-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5" />
              <span>{walletBalance}</span>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{lastUpdated}</span>
              </div>
            )}
            {isCached && (
              <Badge variant="info" size="sm" isPill className="text-xs">
                Cached
              </Badge>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>

        <div className="flex gap-2 -mx-4 -mb-4 px-4 pb-4 mt-4">
          <button
            onClick={handleDeposit}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-harvest-green-50 text-harvest-green-700 font-medium text-sm rounded-b-2xl active:bg-harvest-green-100 touch-manipulation"
          >
            <TrendingUp className="h-4 w-4" />
            Deposit
          </button>
          <button
            onClick={handleWithdraw}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-700 font-medium text-sm rounded-b-2xl active:bg-gray-100 touch-manipulation border-l border-gray-100"
          >
            <PiggyBank className="h-4 w-4" />
            Withdraw
          </button>
        </div>
      </CardBody>
    </Card>
  );
}