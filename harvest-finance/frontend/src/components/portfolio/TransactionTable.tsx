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
  Input
} from '@/components/ui';
import { Transaction, TransactionType } from '@/lib/mock-data';
import { Search, ChevronDown } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
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
        title="Transaction History" 
        subtitle="Recent interactions with Harvest vaults"
      />
      
      <CardBody>
        <div className="flex flex-col md:flex-row gap-4 mb-6 mt-4">
          <div className="flex-1">
            <Input
              placeholder="Search by vault or token..."
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
                {type}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vault</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredTransactions.slice(0, visibleCount).map((tx) => (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="group border-b border-gray-50 hover:bg-harvest-green-50/30 transition-colors"
                  >
                    <td className="py-4 px-4 text-sm text-gray-600">{tx.date}</td>
                    <td className="py-4 px-4">
                      <Badge 
                        variant={
                          tx.type === 'Deposit' ? 'primary' : 
                          tx.type === 'Withdraw' ? 'warning' : 'info'
                        }
                        size="sm"
                      >
                        {tx.type}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 font-medium text-gray-900">{tx.vault}</td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-gray-900">{tx.amount}</span>
                      <span className="ml-1 text-xs text-gray-500">{tx.token}</span>
                    </td>
                    <td className="py-4 px-4">
                      {tx.status === 'Completed' ? <StatusBadge.Completed /> : 
                       tx.status === 'Pending' ? <StatusBadge.Pending /> : 
                       <StatusBadge.Failed />}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {visibleCount < filteredTransactions.length && (
          <div className="mt-8 text-center">
            <Button variant="outline" onClick={loadMore} rightIcon={<ChevronDown className="w-4 h-4" />}>
              Load More
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
