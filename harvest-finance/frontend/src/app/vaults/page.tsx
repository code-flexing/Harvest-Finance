'use client';

import React, { useState, useCallback } from 'react';
import { Container, Section } from '@/components/ui';
import { VaultCard } from '@/components/dashboard/VaultCard';
import { DepositModal } from '@/components/dashboard/DepositModal';
import { WithdrawModal } from '@/components/dashboard/WithdrawModal';
import { ProgressBar } from '@/components/dashboard/ProgressBar';
import { MilestoneConfetti } from '@/components/dashboard/MilestoneConfetti';
import { useMilestones } from '@/hooks/useMilestones';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Coins, Leaf, Shield, Zap } from 'lucide-react';
import { getAchievedMilestones, calculateProgress } from '@/lib/milestones';

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
    seasonalTarget: 5000,
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
    seasonalTarget: 10000,
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
    seasonalTarget: 2000,
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
    seasonalTarget: 20000,
  },
];

function VaultWithProgress({
  vault,
  onDeposit,
  onWithdraw,
}: {
  vault: (typeof MOCK_VAULTS)[number];
  onDeposit: (vaultId: string) => void;
  onWithdraw: (vaultId: string) => void;
}) {
  const deposited = parseFloat(vault.balance) || 0;
  const progress = calculateProgress(deposited, vault.seasonalTarget);
  const achieved = getAchievedMilestones(progress);

  return (
    <div className="space-y-0">
      <VaultCard
        {...vault}
        onDeposit={onDeposit}
        onWithdraw={onWithdraw}
      />
      <div className="px-4 py-4 -mt-1 bg-white dark:bg-zinc-950 border border-t-0 border-gray-100 dark:border-zinc-800 rounded-b-xl">
        <ProgressBar
          progress={progress}
          achievedMilestones={achieved}
          totalDeposited={deposited}
          seasonalTarget={vault.seasonalTarget}
          asset={vault.asset}
        />
      </div>
    </div>
  );
}

export default function VaultsPage() {
  const [selectedVault, setSelectedVault] = useState<(typeof MOCK_VAULTS)[number] | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [vaultBalances, setVaultBalances] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const v of MOCK_VAULTS) {
      map[v.id] = parseFloat(v.balance) || 0;
    }
    return map;
  });

  const vault1Milestones = useMilestones({ vaultId: '1', seasonalTarget: MOCK_VAULTS[0].seasonalTarget });
  const vault2Milestones = useMilestones({ vaultId: '2', seasonalTarget: MOCK_VAULTS[1].seasonalTarget });
  const vault3Milestones = useMilestones({ vaultId: '3', seasonalTarget: MOCK_VAULTS[2].seasonalTarget });
  const vault4Milestones = useMilestones({ vaultId: '4', seasonalTarget: MOCK_VAULTS[3].seasonalTarget });

  const milestoneHooks: Record<string, ReturnType<typeof useMilestones>> = {
    '1': vault1Milestones,
    '2': vault2Milestones,
    '3': vault3Milestones,
    '4': vault4Milestones,
  };

  const handleDepositClick = (vaultId: string) => {
    const vault = MOCK_VAULTS.find((v) => v.id === vaultId) || null;
    setSelectedVault(vault);
    setIsDepositOpen(true);
  };

  const handleWithdrawClick = (vaultId: string) => {
    const vault = MOCK_VAULTS.find((v) => v.id === vaultId) || null;
    setSelectedVault(vault);
    setIsWithdrawOpen(true);
  };

  const handleDepositSuccess = useCallback(
    (vaultId: string, amount: number) => {
      const prev = vaultBalances[vaultId] ?? 0;
      const next = prev + amount;

      setVaultBalances((b) => ({ ...b, [vaultId]: next }));

      const hook = milestoneHooks[vaultId];
      if (hook) {
        const result = hook.processDeposit(prev, next);
        if (result.newMilestones.length > 0) {
          setShowConfetti(true);
        }
      }
    },
    [vaultBalances, milestoneHooks]
  );

  const vaultsWithBalances = MOCK_VAULTS.map((v) => ({
    ...v,
    balance: (vaultBalances[v.id] ?? 0).toFixed(2),
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <Section paddingY="lg">
          <Container size="lg">
            <div className="mb-10">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-50 mb-2">
                Smart Farm Vaults
              </h1>
              <p className="text-gray-600 dark:text-zinc-400">
                Deposit your assets into automated yield-generating strategies. Track your seasonal progress and hit milestones.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {vaultsWithBalances.map((vault) => (
                <VaultWithProgress
                  key={vault.id}
                  vault={vault}
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
        onDepositSuccess={handleDepositSuccess}
      />

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        vault={selectedVault}
      />

      <MilestoneConfetti
        trigger={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />
    </div>
  );
}
