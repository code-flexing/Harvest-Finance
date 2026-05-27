'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Stack,
  Inline,
  ThemeToggle,
  TransactionRowSkeleton,
  TransactionStatusBadge,
} from '@/components/ui';
import { Download, ArrowRightLeft, Calendar, Tag, Coins, Info } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import axios from '@/lib/api-client';

// Mock transactions for display since we might not have many in the DB yet
const mockTransactions = [
  { id: '1', date: '2024-03-25T10:00:00Z', type: 'Deposit', vault: 'USDC Stable Yield', amount: '1,000.00', status: 'CONFIRMED' },
  { id: '2', date: '2024-03-24T15:30:00Z', type: 'Reward', vault: 'ETH Staking Vault', amount: '0.05', status: 'CLAIMED' },
  { id: '3', date: '2024-03-22T09:15:00Z', type: 'Withdraw', vault: 'USDC Stable Yield', amount: '200.00', status: 'CONFIRMED' },
  { id: '4', date: '2024-03-20T11:45:00Z', type: 'Deposit', vault: 'Harvest Liquidity', amount: '500.00', status: 'CONFIRMED' },
  { id: '5', date: '2024-03-18T14:20:00Z', type: 'Reward', vault: 'WBTC Auto-Compound', amount: '0.001', status: 'CLAIMED' },
];

export default function TransactionsPage() {
  const { user, token } = useAuthStore();
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  const handleExport = async (format: 'csv' | 'excel') => {
    if (!user) return;
    
    setIsExporting(format);
    try {
      const response = await axios.get(
        `http://localhost:3001/api/v1/export/users/${user.id}/transactions`,
        {
          params: { format },
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      // Create a link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const extension = format === 'csv' ? 'csv' : 'xlsx';
      link.setAttribute('download', `transactions_${user.name}_${Date.now()}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export transactions. Please try again.');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d1f12]">
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Transaction History
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            View and download your complete history of deposits, withdrawals, and rewards.
          </p>
        </div>
        <Inline gap="md">
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => handleExport('csv')}
            isLoading={isExporting === 'csv'}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-harvest-green-50 dark:bg-harvest-green-900/20 text-harvest-green-700 dark:text-harvest-green-300 border-harvest-green-200 dark:border-harvest-green-800/50 hover:bg-harvest-green-100 dark:hover:bg-harvest-green-900/30"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => handleExport('excel')}
            isLoading={isExporting === 'excel'}
          >
            Export Excel
          </Button>
        </Inline>
      </div>

      <Card variant="default">
        <CardBody className="p-0 overflow-x-auto">
          <div className="min-w-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Vault / Token</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <TransactionRowSkeleton key={i} />)
                : mockTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium text-gray-900 dark:text-gray-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      {new Date(tx.date).toLocaleDateString('en-US')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tx.type === 'Deposit' ? 'primary' : tx.type === 'Withdraw' ? 'warning' : 'success'} size="sm">
                      {tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-200">{tx.vault}</TableCell>
                  <TableCell className="font-bold text-gray-900 dark:text-white">{tx.amount}</TableCell>
                  <TableCell>
                    <TransactionStatusBadge status={tx.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Details</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardBody>
      </Card>
      
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-[rgba(59,130,246,0.07)] p-4 rounded-xl border border-blue-100 dark:border-[rgba(59,130,246,0.15)]">
        <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0" />
        <p>
          Need a report for tax purposes? Use the Export Excel button to get a detailed spreadsheet of all your agricultural investments.
        </p>
      </div>
    </div>
    </div>
  );
}
