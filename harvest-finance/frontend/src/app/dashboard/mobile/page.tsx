'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { 
  Bot, 
  Database, 
  Leaf, 
  RefreshCcw, 
  TrendingUp, 
  Wallet,
  Plus,
  WifiOff
} from 'lucide-react';
import { Badge, Button, Card, CardBody } from '@/components/ui';

import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { MobileDashboardLayout } from '@/components/dashboard/MobileDashboardLayout';
import { MobileVaultCard } from '@/components/dashboard/MobileVaultCard';
import { TransactionList } from '@/components/dashboard/TransactionList';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';

import { useOfflineData } from '@/hooks/useOfflineData';
import { useOfflineIndicator } from '@/hooks/useOfflineData';

const defaultVaults = [
  { id: "vault-1", name: "Maize Yield Vault", asset: "USDC", apy: "12.5%", tvl: "$1.2M", balance: "$4,280", walletBalance: "$1,120", progress: 72, cropType: "Maize" },
  { id: "vault-2", name: "Wheat Growth Pool", asset: "USDC", apy: "8.3%", tvl: "$840K", balance: "$2,150", walletBalance: "$540", progress: 45, cropType: "Wheat" },
  { id: "vault-3", name: "Rice Harvest Fund", asset: "USDC", apy: "15.2%", tvl: "$620K", balance: "$1,640", walletBalance: "$390", progress: 28, cropType: "Rice" },
];

export default function MobileDashboardPage() {
  const { isOnline, pendingActions, triggerSync } = useOfflineData();
  const { isOnline: isOnlineSimple, pendingCount } = useOfflineIndicator();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOnlineSimple && pendingCount > 0) {
      void triggerSync();
    }
  }, [isOnlineSimple, pendingCount, triggerSync]);

  const handleSync = useCallback(async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      await triggerSync();
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, triggerSync]);

  const quickActions = [
    { title: "Vault Balance", value: "$8,070", helper: "Across all vaults", icon: Wallet, color: "bg-harvest-green-50 text-harvest-green-700" },
    { title: "Total Deposits", value: "$7,540", helper: "Including pending", icon: Database, color: "bg-blue-50 text-blue-700" },
    { title: "Active Rewards", value: "+$530", helper: "This season", icon: TrendingUp, color: "bg-emerald-50 text-emerald-700" },
    { title: "Vaults", value: "3", helper: "2 active, 1 pending", icon: Leaf, color: "bg-purple-50 text-purple-700" },
  ];

  return (
    <MobileDashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      userName="Emmanuel Farms"
    >
      <div className="space-y-6 pb-20">
        <div className="space-y-4">
          <Badge variant="primary" className="w-fit">Farm Vault Dashboard</Badge>
          <h1 className="text-2xl font-bold text-gray-900">
            Good morning, Emmanuel
          </h1>
          <p className="text-sm text-gray-600">
            Track your vault health, view AI insights, and sync when ready.
          </p>
        </div>

        {!isOnline && (
          <Card variant="outlined" className="border-amber-200 bg-amber-50/80">
            <CardBody className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <WifiOff className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">Offline Mode</p>
                  <p className="mt-1 text-sm text-amber-800">
                    Viewing cached data. {pendingActions > 0 && `${pendingActions} changes will sync when online.`}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Card key={idx} variant="default" className="touch-manipulation">
                <CardBody className="p-3 space-y-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs text-gray-500">{card.title}</p>
                  <p className="text-lg font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-400">{card.helper}</p>
                </CardBody>
              </Card>
            );
          })}
        </div>

        <WeatherWidget />

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Vaults</h2>
            <Button variant="outline" size="sm" className="sm:hidden" leftIcon={<Plus className="h-4 w-4" />}>
              New
            </Button>
          </div>
          <div className="space-y-3">
            {defaultVaults.map((vault) => (
              <MobileVaultCard
                key={vault.id}
                id={vault.id}
                name={vault.name}
                asset={vault.asset}
                apy={vault.apy}
                tvl={vault.tvl}
                balance={`$${vault.balance}`}
                walletBalance={`$${vault.walletBalance}`}
                progress={vault.progress}
                cropType={vault.cropType}
                isCached={!isOnline}
                onDeposit={() => console.log('Deposit', vault.id)}
                onWithdraw={() => console.log('Withdraw', vault.id)}
              />
            ))}
          </div>
        </div>

        <AIInsightsPanel isOnline={isOnline} maxItems={3} showFilters />

        <TransactionList maxItems={5} />

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            leftIcon={<RefreshCcw className="h-4 w-4" />}
            onClick={handleSync}
            isLoading={isSyncing}
            isDisabled={!isOnline}
          >
            Sync Now
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            leftIcon={<Bot className="h-4 w-4" />}
          >
            AI Chat
          </Button>
        </div>
      </div>
    </MobileDashboardLayout>
  );
}