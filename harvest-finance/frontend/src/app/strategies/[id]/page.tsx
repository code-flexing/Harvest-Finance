'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Container, Section } from '@/components/ui';
import { StrategyDetails } from '@/components/dashboard/StrategyDetails';
import { DepositModal } from '@/components/dashboard/DepositModal';
import { WithdrawModal } from '@/components/dashboard/WithdrawModal';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Vault } from '@/types/vault';
import { ModalSkeleton } from '@/components/ui/Skeleton';
import { Coins, Leaf, Shield, Zap } from 'lucide-react';

const MOCK_VAULTS: Vault[] = [
  {
    id: "1",
    name: "Stellar USDC Yield",
    asset: "USDC",
    apy: 8.5,
    tvl: 12400000,
    riskLevel: "Low",
    balance: "1250.00",
    walletBalance: "5000.00",
    iconName: "Coins",
    seasonalTarget: 5000,
    strategyType: "Audited",
    description: "The Stellar USDC Yield strategy is our flagship stablecoin yield engine. It leverages institutional-grade liquidity pools on Stellar to generate consistent returns while maintaining 1:1 asset backing. Perfect for conservative capital preservation."
  },
  {
    id: "2",
    name: "XLM Alpha Vault",
    asset: "XLM",
    apy: 12.2,
    tvl: 8100000,
    riskLevel: "Medium",
    balance: "0.00",
    walletBalance: "12,450.00",
    iconName: "Zap",
    seasonalTarget: 10000,
    strategyType: "Community",
    description: "XLM Alpha Vault is designed for the Stellar native asset. It utilizes dynamic market-making strategies to capture volatility premiums. Recommended for long-term XLM holders looking to increase their stack size."
  },
  {
    id: "3",
    name: "Eco-Farm Governance",
    asset: "HRVST",
    apy: 24.5,
    tvl: 4200000,
    riskLevel: "Low",
    balance: "450.00",
    walletBalance: "1,200.00",
    iconName: "Leaf",
    seasonalTarget: 2000,
    strategyType: "Audited",
    description: "Eco-Farm Governance allows HRVST holders to earn yield while participating in protocol decision-making. Yield is generated through a mix of governance rewards and platform fee sharing."
  },
  {
    id: "4",
    name: "Stable-Harvest Plus",
    asset: "yUSDC",
    apy: 6.8,
    tvl: 25900000,
    riskLevel: "Low",
    balance: "10000.00",
    walletBalance: "2500.00",
    iconName: "Shield",
    seasonalTarget: 20000,
    strategyType: "Experimental",
    description: "Stable-Harvest Plus is an advanced yield aggregator that scans multiple Stellar protocols for the highest USDC-equivalent yields. It features auto-compounding and automated risk management."
  },
];

const getVaultIcon = (iconName: string | undefined) => {
  switch (iconName) {
    case "Coins": return <Coins className="w-10 h-10" />;
    case "Zap": return <Zap className="w-10 h-10" />;
    case "Leaf": return <Leaf className="w-10 h-10" />;
    case "Shield": return <Shield className="w-10 h-10" />;
    default: return <Zap className="w-10 h-10" />;
  }
};

export default function StrategyDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const { data: vaults = [], isLoading } = useQuery<Vault[]>({
    queryKey: ["vaults"],
    queryFn: async () => {
      const response = await apiClient.get("/api/v1/vaults/public");
      return response.data;
    },
    initialData: MOCK_VAULTS,
  });

  const vault = vaults.find(v => v.id === id) || MOCK_VAULTS.find(v => v.id === id);

  if (isLoading) {
return (
     <div className="min-h-screen bg-[#f4f8f0] dark:bg-[#0d1f12]">
       <main className="pt-24 pb-16">
         <Section>
           <Container size="lg">
             <div className="animate-pulse space-y-8">
               <div className="h-6 w-32 bg-gray-200 dark:bg-white/5 rounded-lg" />
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 h-[600px] bg-gray-200 dark:bg-white/5 rounded-[2.5rem]" />
                <div className="h-[400px] bg-gray-200 dark:bg-white/5 rounded-[2.5rem]" />
             </div>
             </div>
           </Container>
         </Section>
       </main>
     );
  }

  if (!vault) {
    return (
      <div className="min-h-screen bg-[#f4f8f0] dark:bg-[#0d1f12] flex flex-col">
        <Header />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">Strategy Not Found</h1>
            <p className="text-gray-500 mb-8">The strategy you are looking for does not exist or has been retired.</p>
            <Link href="/vaults" className="text-harvest-green-600 font-black uppercase tracking-widest">Return to Marketplace</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const vaultWithIcon = {
    ...vault,
    icon: getVaultIcon(vault.iconName)
  };

  return (
    <div className="min-h-screen bg-[#f4f8f0] dark:bg-[#0d1f12] flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <Section>
          <Container size="lg">
            <StrategyDetails 
              vault={vaultWithIcon} 
              onDeposit={() => setIsDepositOpen(true)}
              onWithdraw={() => setIsWithdrawOpen(true)}
            />
          </Container>
        </Section>
      </main>

      <Footer />

      <DepositModal 
        isOpen={isDepositOpen} 
        onClose={() => setIsDepositOpen(false)} 
        vault={vault} 
      />
      <WithdrawModal 
        isOpen={isWithdrawOpen} 
        onClose={() => setIsWithdrawOpen(false)} 
        vault={vault} 
      />
    </div>
  );
}
