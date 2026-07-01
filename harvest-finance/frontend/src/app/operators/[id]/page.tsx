'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Container, Section, Card, CardBody, CardHeader, Button, Badge, cn } from '@/components/ui';
import { CircularGauge } from '@/components/operator/CircularGauge';
import { ScoreBreakdown } from '@/components/operator/ScoreBreakdown';
import { ScoreHistoryChart } from '@/components/operator/ScoreHistoryChart';
import { operatorApi } from '@/lib/api/operator-client';
import { ArrowLeft, ArrowUpRight, Activity, Calendar } from 'lucide-react';
import type { OperatorReputation } from '@/types/operator';

const MOCK_REPUTATION: OperatorReputation = {
  operatorId: '1',
  operatorName: 'Harvest Alpha Fund',
  overallScore: 87,
  components: {
    vaultPerformance: 92,
    operatorTenure: 85,
    governanceParticipation: 78,
    securityIncidents: 95,
  },
  vaultHistory: [
    { vaultId: '1', vaultName: 'Stellar USDC Yield', asset: 'USDC', apy: '8.5', tvl: '$12.4M', status: 'active', startDate: '2024-03-15' },
    { vaultId: '2', vaultName: 'XLM Alpha Vault', asset: 'XLM', apy: '12.2', tvl: '$8.1M', status: 'active', startDate: '2024-06-01' },
    { vaultId: '3', vaultName: 'Eco-Farm Governance', asset: 'HRVST', apy: '24.5', tvl: '$4.2M', status: 'active', startDate: '2024-09-10' },
  ],
  scoreHistory: Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2025, i, 1);
    return { date: d.toISOString(), score: Math.round(75 + Math.sin(i * 0.5) * 10 + Math.random() * 5) };
  }),
};

const statusVariant = (status: string) => {
  switch (status) {
    case 'active': return 'success';
    case 'paused': return 'warning';
    case 'closed': return 'error';
    default: return 'default';
  }
};

export default function OperatorProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [showBreakdown, setShowBreakdown] = useState(false);

  const { data: rep, isLoading } = useQuery<OperatorReputation>({
    queryKey: ['operator-reputation', id],
    queryFn: () => operatorApi.getReputation(id),
    initialData: MOCK_REPUTATION,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f8f0] dark:bg-[#0d1f12] flex items-center justify-center">
        <div className="text-gray-500">Loading operator profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f8f0] dark:bg-[#0d1f12] flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <Section>
          <Container size="lg">
            <div className="mb-8">
              <Link
                href="/vaults"
                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-harvest-green-600 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Vaults
              </Link>
            </div>

            {/* Hero Section */}
            <div className="grid lg:grid-cols-3 gap-8 mb-12">
              <Card className="lg:col-span-1 flex flex-col items-center justify-center p-10 border border-gray-200 dark:border-white/5">
                <CardBody className="flex flex-col items-center">
                  <button onClick={() => setShowBreakdown(true)} className="focus:outline-none">
                    <CircularGauge score={rep.overallScore} size={160} strokeWidth={10} />
                  </button>
                  <h1 className="mt-6 text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
                    {rep.operatorName}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Operator ID: {rep.operatorId}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <Badge variant={rep.overallScore >= 80 ? 'success' : rep.overallScore >= 60 ? 'warning' : 'error'} size="sm">
                      {rep.overallScore >= 80 ? 'Trusted' : rep.overallScore >= 60 ? 'Moderate' : 'Caution'}
                    </Badge>
                  </div>
                </CardBody>
              </Card>

              <Card className="lg:col-span-2 border border-gray-200 dark:border-white/5">
                <CardBody className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tighter">
                      Trust Score Overview
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBreakdown(!showBreakdown)}
                      className="rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      {showBreakdown ? 'Hide' : 'View'} Breakdown
                    </Button>
                  </div>
                  {showBreakdown && <ScoreBreakdown components={rep.components} />}
                  {!showBreakdown && (
                    <div className="py-8 text-center">
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        Click the score gauge or press &quot;View Breakdown&quot; to see detailed score components
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Score History Chart */}
            <Card className="mb-8 border border-gray-200 dark:border-white/5">
              <CardHeader className="p-8 pb-0">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-harvest-green-500" />
                  <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tighter">
                    Score History
                  </h2>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    12 Month Trend
                  </span>
                </div>
              </CardHeader>
              <CardBody className="p-8 pt-4">
                <ScoreHistoryChart data={rep.scoreHistory} height={250} />
              </CardBody>
            </Card>

            {/* Vault History */}
            <Card className="border border-gray-200 dark:border-white/5">
              <CardHeader className="p-8 pb-0">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-harvest-green-500" />
                  <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tighter">
                    Vault History
                  </h2>
                </div>
              </CardHeader>
              <CardBody className="p-8 pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5">
                        <th className="pb-3 pr-4">Vault</th>
                        <th className="pb-3 pr-4">Asset</th>
                        <th className="pb-3 pr-4">APY</th>
                        <th className="pb-3 pr-4">TVL</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4">Start Date</th>
                        <th className="pb-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {rep.vaultHistory.map((vault) => (
                        <tr
                          key={vault.vaultId}
                          className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <td className="py-4 pr-4">
                            <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                              {vault.vaultName}
                            </span>
                          </td>
                          <td className="py-4 pr-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{vault.asset}</span>
                          </td>
                          <td className="py-4 pr-4">
                            <span className="text-sm font-bold text-emerald-500">{vault.apy}%</span>
                          </td>
                          <td className="py-4 pr-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{vault.tvl}</span>
                          </td>
                          <td className="py-4 pr-4">
                            <Badge variant={statusVariant(vault.status)} size="sm">
                              {vault.status}
                            </Badge>
                          </td>
                          <td className="py-4 pr-4">
                            <span className="text-sm text-gray-500">{vault.startDate}</span>
                          </td>
                          <td className="py-4">
                            <Link
                              href={`/strategies/${vault.vaultId}`}
                              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-harvest-green-600 hover:text-harvest-green-700 transition-colors"
                            >
                              View
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          </Container>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
