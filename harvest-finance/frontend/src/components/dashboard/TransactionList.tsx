'use client';

import React, { useCallback, useState } from 'react';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Gift, 
  RefreshCw, 
  Clock,
  CheckCircle2,
  AlertCircle,
  CloudOff,
  ChevronRight
} from 'lucide-react';
import { Badge, Card, CardBody } from '@/components/ui';
import { useOfflineData } from '@/hooks/useOfflineData';
import { TransactionData } from '@/lib/db';

interface TransactionListProps {
  maxItems?: number;
  showHeader?: boolean;
  onTransactionClick?: (tx: TransactionData) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  deposit: ArrowDownCircle,
  withdraw: ArrowUpCircle,
  reward: Gift,
  transfer: RefreshCw,
};

const typeColors: Record<string, string> = {
  deposit: 'bg-emerald-50 text-emerald-600',
  withdraw: 'bg-amber-50 text-amber-600',
  reward: 'bg-purple-50 text-purple-600',
  transfer: 'bg-blue-50 text-blue-600',
};

const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  completed: { color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2, label: 'Completed' },
  pending: { color: 'bg-amber-50 text-amber-600', icon: Clock, label: 'Pending' },
  failed: { color: 'bg-red-50 text-red-600', icon: AlertCircle, label: 'Failed' },
};

export function TransactionList({ maxItems = 10, showHeader = true, onTransactionClick }: TransactionListProps) {
  const { transactions } = useOfflineData();
  const [showAll, setShowAll] = useState(false);

  const displayedTx = showAll ? transactions : transactions.slice(0, maxItems);

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const formatAmount = (amount: number, type: string): string => {
    const prefix = type === 'deposit' || type === 'reward' ? '+' : '-';
    return `${prefix}$${amount.toLocaleString()}`;
  };

  const handleTxClick = useCallback((tx: TransactionData) => {
    onTransactionClick?.(tx);
  }, [onTransactionClick]);

  return (
    <Card variant="default" className="overflow-hidden">
      {showHeader && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            <Badge variant="primary" size="sm">
              {transactions.length} total
            </Badge>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {displayedTx.length === 0 ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No transactions yet</p>
          </div>
        ) : (
          displayedTx.map((tx) => {
            const Icon = typeIcons[tx.type] || RefreshCw;
            const iconColor = typeColors[tx.type] || typeColors.transfer;
            const status = statusConfig[tx.status] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <div
                key={tx.id}
                className="p-4 active:bg-gray-50 touch-manipulation cursor-pointer"
                onClick={() => handleTxClick(tx)}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center gap-3">
                  <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl ${iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 capitalize">{tx.type}</span>
                      {tx.pendingSync && (
                        <Badge variant="warning" size="sm" isPill className="text-xs">
                          <CloudOff className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      <span>{formatTime(tx.timestamp)}</span>
                      <span className="text-gray-300">•</span>
                      <div className={`inline-flex items-center gap-1 ${status.color} px-1.5 py-0.5 rounded-full`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-semibold ${tx.type === 'deposit' || tx.type === 'reward' ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {formatAmount(tx.amount, tx.type)}
                    </p>
                  </div>

                  <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {transactions.length > maxItems && (
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-sm font-medium text-harvest-green-600 hover:text-harvest-green-700 active:bg-harvest-green-50 touch-manipulation"
          >
            {showAll ? 'Show less' : `View all ${transactions.length} transactions`}
          </button>
        </div>
      )}
    </Card>
  );
}