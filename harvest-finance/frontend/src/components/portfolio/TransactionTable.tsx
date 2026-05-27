'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card, 
  CardHeader, 
  CardBody, 
  Badge, 
  StatusBadge, 
  Button,
  Input,
  TransactionRowSkeleton,
} from '@/components/ui';
import { Transaction, TransactionType } from '@/lib/mock-data';
import { Search, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TransactionTableProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, isLoading = false }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'All'>('All');
  const [visibleCount, setVisibleCount] = useState(5);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.vault.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         tx.token.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'All' || tx.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const loadMore = () => {
    setVisibleCount(prev => prev + 5);
  };

  return (
    <Card variant="default" className="w-full overflow-hidden">
      <CardHeader 
        title={t('portfolio.transaction_history')} 
        subtitle={t('portfolio.transaction_desc')}
      />
      
      <CardBody>
        <div className="flex flex-col md:flex-row gap-4 mb-6 mt-4">
          <div className="flex-1">
            <Input
              placeholder={t('common.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-gray-400" />}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['All', 'Deposit', 'Withdraw', 'Reward'] as const).map((type) => (
              <Button
                key={type}
                variant={filterType === type ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterType(type)}
              >
                {type === 'All' ? t('common.all') : t(`common.${type.toLowerCase()}`)}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[rgba(141,187,85,0.12)] bg-gray-50/50 dark:bg-[#1a3020]">
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.date')}</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.type')}</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.vault')}</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.amount')}</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <TransactionRowSkeleton key={i} />)
              ) : (
              <AnimatePresence mode="popLayout">
                {filteredTransactions.slice(0, visibleCount).map((tx) => (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="group border-b border-gray-50 dark:border-[rgba(141,187,85,0.08)] hover:bg-harvest-green-50/30 dark:hover:bg-[rgba(74,222,128,0.05)] transition-colors"
                  >
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">{tx.date}</td>
                    <td className="py-4 px-4">
                      <Badge 
                        variant={
                          tx.type === 'Deposit' ? 'primary' : 
                          tx.type === 'Withdraw' ? 'warning' : 'info'
                        }
                        size="sm"
                      >
                        {t(`common.${tx.type.toLowerCase()}`)}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">{tx.vault}</td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-gray-900 dark:text-white">{tx.amount}</span>
                      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">{tx.token}</span>
                    </td>
                    <td className="py-4 px-4">
                      {tx.status === 'Completed' ? <StatusBadge.Completed /> : 
                       tx.status === 'Pending' ? <StatusBadge.Pending /> : 
                       <StatusBadge.Failed />}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {visibleCount < filteredTransactions.length && (
          <div className="mt-8 text-center">
            <Button variant="outline" onClick={loadMore} rightIcon={<ChevronDown className="w-4 h-4" />}>
              {t('common.load_more')}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
