'use client';

import React, { useState } from 'react';
import { Container, Section, Stack, Inline, Button } from '@/components/ui';
import { VaultCard } from '@/components/dashboard/VaultCard';
import { DepositModal } from '@/components/dashboard/DepositModal';
import { WithdrawModal } from '@/components/dashboard/WithdrawModal';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Coins, Leaf, Shield, Zap } from 'lucide-react';

const MOCK_VAULTS = [
  {
    id: '1',
    name: 'Stellar USDC Yield',
    asset: 'USDC',
    apy: '8.5%',
    tvl: '$12.4M',
    balance: '1250.00',
    walletBalance: '5000.00',
    icon: <Coins className="w-6 h-6" />,
  },
  {
    id: '2',
    name: 'XLM Alpha Vault',
    asset: 'XLM',
    apy: '12.2%',
    tvl: '$8.1M',
    balance: '0.00',
    walletBalance: '12,450.00',
    icon: <Zap className="w-6 h-6" />,
  },
  {
    id: '3',
    name: 'Eco-Farm Governance',
    asset: 'HRVST',
    apy: '24.5%',
    tvl: '$4.2M',
    balance: '450.00',
    walletBalance: '1,200.00',
    icon: <Leaf className="w-6 h-6" />,
  },
  {
    id: '4',
    name: 'Stable-Harvest Plus',
    asset: 'yUSDC',
    apy: '6.8%',
    tvl: '$25.9M',
    balance: '10000.00',
    walletBalance: '2500.00',
    icon: <Shield className="w-6 h-6" />,
  },
];

export default function VaultsPage() {
  const [selectedVault, setSelectedVault] = useState<typeof MOCK_VAULTS[0] | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const handleDepositClick = (vaultId: string) => {
    const vault = MOCK_VAULTS.find(v => v.id === vaultId) || null;
    setSelectedVault(vault);
    setIsDepositOpen(true);
  };

  const handleWithdrawClick = (vaultId: string) => {
    const vault = MOCK_VAULTS.find(v => v.id === vaultId) || null;
    setSelectedVault(vault);
    setIsWithdrawOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <Section paddingY="lg">
          <Container size="lg">
            <div className="mb-10">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Vaults</h1>
              <p className="text-gray-600">
                Deposit your assets into automated yield-generating strategies.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
              {MOCK_VAULTS.map((vault) => (
                <VaultCard
                  key={vault.id}
                  {...vault}
                  onDeposit={handleDepositClick}
                  onWithdraw={handleWithdrawClick}
                />
              ))}
            </div>
          </Container>
        </Section>
      </main>
      
      <Footer />
      
      <DepositModal 
        isOpen={isDepositOpen} 
        onClose={() => setIsDepositOpen(false)} 
        vault={selectedVault} 
      />
      
      <WithdrawModal 
        isOpen={isWithdrawOpen} 
        onClose={() => setIsWithdrawOpen(false)} 
        vault={selectedVault} 
      />
    </div>
  );
}
