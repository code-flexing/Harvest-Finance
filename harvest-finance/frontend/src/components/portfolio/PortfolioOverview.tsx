'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardBody, Badge } from '@/components/ui';
import { PortfolioStats } from '@/lib/mock-data';
import { Wallet, TrendingUp, Award } from 'lucide-react';

interface PortfolioOverviewProps {
  stats: PortfolioStats;
}

export const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Total Deposited',
      value: stats.totalDeposited,
      icon: <Wallet className="w-5 h-5 text-harvest-green-600" />,
      subtitle: 'Assets in vaults',
    },
    {
      title: 'Total Rewards',
      value: stats.totalRewards,
      icon: <Award className="w-5 h-5 text-harvest-green-600" />,
      subtitle: 'Earned from yields',
    },
    {
      title: 'Portfolio Value',
      value: stats.portfolioValue,
      icon: <TrendingUp className="w-5 h-5 text-harvest-green-600" />,
      subtitle: 'Current total balance',
      trend: stats.change24h,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card variant="elevated" className="h-full border-t-4 border-t-harvest-green-500">
            <CardHeader
              title={card.title}
              subtitle={card.subtitle}
              action={card.icon}
            />
            <CardBody className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-gray-900">{card.value}</span>
                {card.trend && (
                  <Badge variant="success" size="sm" isPill>
                    {card.trend}
                  </Badge>
                )}
              </div>
            </CardBody>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
