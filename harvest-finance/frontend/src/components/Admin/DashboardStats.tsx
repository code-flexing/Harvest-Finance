'use client';

import React from 'react';
import { Card, CardBody, Stack, Inline } from '@/components/ui';
import { Users, UserPlus, Landmark, Coins, TrendingUp, BarChart3, ArrowDownLeft } from 'lucide-react';

interface StatsProps {
  stats: {
    totalUsers: number;
    totalDeposits: number;
    activeUsers: number;
    totalRewardsDistributed: number;
    activeVaults: number;
    averageApy: number;
    totalWithdrawals?: number;
  };
}

export const DashboardStats: React.FC<StatsProps> = ({ stats }) => {
  const statItems = [
    {
      label: 'Total Users',
      value: stats.totalUsers.toString(),
      icon: <Users className="w-5 h-5 text-blue-600" />,
      color: 'bg-blue-50',
    },
    {
      label: 'Active Users',
      value: stats.activeUsers.toString(),
      icon: <UserPlus className="w-5 h-5 text-harvest-green-600" />,
      color: 'bg-harvest-green-50',
    },
    {
      label: 'Total Deposits',
      value: `$${stats.totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: <Landmark className="w-5 h-5 text-harvest-green-600" />,
      color: 'bg-harvest-green-50',
    },
    {
      label: 'Total Withdrawals',
      value: `$${(stats.totalWithdrawals ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: <ArrowDownLeft className="w-5 h-5 text-red-500" />,
      color: 'bg-red-50',
    },
    {
      label: 'Rewards Distributed',
      value: `$${stats.totalRewardsDistributed.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: <Coins className="w-5 h-5 text-amber-600" />,
      color: 'bg-amber-50',
    },
    {
      label: 'Active Vaults',
      value: stats.activeVaults.toString(),
      icon: <BarChart3 className="w-5 h-5 text-purple-600" />,
      color: 'bg-purple-50',
    },
    {
      label: 'Average APY',
      value: `${stats.averageApy.toFixed(2)}%`,
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
      color: 'bg-emerald-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, index) => (
        <Card key={index} className="border-none shadow-md hover:shadow-lg transition-all duration-300">
          <CardBody>
            <Stack gap="md">
              <Inline align="center" className="justify-between">
                <div className={cn('p-2 rounded-lg', item.color)}>
                  {item.icon}
                </div>
              </Inline>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.label}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{item.value}</h3>
              </div>
            </Stack>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};

// Internal utility to keep it self-contained if cn is not imported correctly elsewhere
function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}
