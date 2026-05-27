'use client';

import React from 'react';
import { Card, CardHeader, CardBody, Stack, Badge, Button, Container, Section, cn } from '@/components/ui';
import { TrendingUp, ShieldCheck, Activity, Zap, ArrowLeft, Info, Wallet, ExternalLink, Scale } from 'lucide-react';
import { Vault } from '@/types/vault';
import Link from 'next/link';
import { formatCurrency, formatPercentage } from '@/lib/vault-utils';

interface StrategyDetailsProps {
  vault: Vault;
  onDeposit: (id: string) => void;
  onWithdraw: (id: string) => void;
}

export const StrategyDetails: React.FC<StrategyDetailsProps> = ({ vault, onDeposit, onWithdraw }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Link 
        href="/vaults" 
        className="inline-flex items-center gap-2 text-sm font-black text-gray-400 hover:text-harvest-green-600 transition-colors uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </Link>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content Area */}
        <div className="flex-1 space-y-8">
          <Card className="glass-panel glass-rim p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8">
               <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active Strategy</span>
               </div>
            </div>

            <div className="flex items-start gap-6 mb-10">
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white dark:bg-gray-800 text-harvest-green-600 shadow-2xl ring-1 ring-gray-100 dark:ring-gray-700 transition-transform hover:scale-110 hover:rotate-3">
                 {vault.icon || <Zap className="w-10 h-10" />}
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter mb-3">
                  {vault.name}
                </h1>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="px-3 py-1 text-[10px] font-black uppercase tracking-widest border-gray-100">
                    {vault.asset} Native
                  </Badge>
                  <Badge variant="success" className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {vault.riskLevel} Risk
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1 text-[10px] font-black uppercase tracking-widest border-gray-100">
                    {vault.strategyType || 'Audited'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
               <div className="p-6 rounded-3xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 shadow-inner">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Projected APY</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-emerald-500 tracking-tighter">{formatPercentage(vault.apy)}</span>
                    <TrendingUp className="w-4 h-4 text-emerald-500 mb-1" />
                  </div>
               </div>
               <div className="p-6 rounded-3xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 shadow-inner">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Total Value Locked</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{formatCurrency(vault.tvl)}</span>
                  </div>
               </div>
               <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 shadow-inner">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2">Your Position</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">{vault.balance}</span>
                    <span className="text-[10px] font-bold text-emerald-600/60 uppercase">{vault.asset}</span>
                  </div>
               </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <Info className="w-5 h-5 text-harvest-green-600" />
                Strategy Description
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                {vault.description || `The ${vault.name} strategy automates capital deployment into optimized liquidity pools on the Stellar network. By utilizing Soroban smart contracts, it continuously rebalances to capture maximum yield while minimizing slippage and gas overhead. This strategy is primarily focused on ${vault.asset} assets and maintains a ${vault.riskLevel.toLowerCase()} risk profile through diversified exposure.`}
              </p>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="glass-panel glass-rim p-8">
              <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight mb-6 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Security Verification
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Smart Contract Audit", status: "Verified", date: "Jan 2026" },
                  { label: "Liquidity Threshold", status: "Optimal", date: "Real-time" },
                  { label: "Oracle Reliability", status: "High", date: "Stable" }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-white/5 last:border-0">
                    <span className="text-xs font-bold text-gray-500">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{item.status}</span>
                      <span className="text-[9px] text-gray-400 font-medium">{item.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="glass-panel glass-rim p-8">
              <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight mb-6 flex items-center gap-2">
                <Scale className="w-5 h-5 text-harvest-green-600" />
                Allocation Parameters
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Withdrawal Fee", value: "0.1%" },
                  { label: "Performance Fee", value: "10%" },
                  { label: "Max Capacity", value: "50.0M USDC" }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-white/5 last:border-0">
                    <span className="text-xs font-bold text-gray-500">{item.label}</span>
                    <span className="text-sm font-black text-gray-900 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Sidebar / Actions Area */}
        <div className="w-full lg:w-[400px] space-y-8">
          <Card className="glass-panel glass-rim p-8 sticky top-24">
             <div className="mb-8">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Available Capital</p>
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shadow-inner">
                      <Wallet className="w-5 h-5 text-gray-400" />
                   </div>
                   <div>
                      <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{vault.walletBalance} {vault.asset}</p>
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Wallet Ready</p>
                   </div>
                </div>
             </div>

             <Stack gap="md">
               <Button
                 variant="primary"
                 fullWidth
                 size="lg"
                 onClick={() => onDeposit(vault.id)}
                 className="rounded-2xl py-8 text-xl font-black shadow-2xl shadow-harvest-green-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] animate-shimmer"
               >
                 <div className="flex items-center gap-2">
                   <span>Deploy Capital</span>
                   <Zap className="h-5 w-5" />
                 </div>
               </Button>
               <Button
                 variant="outline"
                 fullWidth
                 size="lg"
                 onClick={() => onWithdraw(vault.id)}
                 className="rounded-2xl py-8 text-xl font-black border-2 border-gray-100 dark:border-gray-800 transition-all hover:bg-white dark:hover:bg-gray-800 hover:text-harvest-green-600 hover:border-harvest-green-500/30"
               >
                 Recall Assets
               </Button>
             </Stack>

             <div className="mt-8 p-6 rounded-3xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800">
                <div className="flex items-start gap-4">
                   <div className="p-2 bg-blue-500/10 rounded-lg">
                      <ExternalLink className="w-4 h-4 text-blue-500" />
                   </div>
                   <div>
                      <p className="text-xs font-black text-gray-900 dark:text-white mb-1 uppercase tracking-wider">Explorer</p>
                      <p className="text-[10px] text-gray-500 font-medium">View this strategy directly on Stellar Expert explorer.</p>
                   </div>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
