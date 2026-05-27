'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, CardFooter, Button, Badge, Stack, Tooltip, cn } from '@/components/ui';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft, Info, ShieldCheck, Activity } from 'lucide-react';
import { StrategyType } from '@/types/vault';
import { formatI128 } from '@/lib/soroban-i128';
import { getTermTooltip } from '@/lib/defi-terms';

export interface VaultProps {
  id: string;
  name: string;
  asset: string;
  apy: string;
  tvl: string;
  balance: string;
  walletBalance: string;
  icon: React.ReactNode;
  strategyType?: StrategyType;
  riskLevel?: 'Low' | 'Medium' | 'High';
  onDeposit: (vaultId: string) => void;
  onWithdraw: (vaultId: string) => void;
  shares?: number | string;
}

export const VaultCard: React.FC<VaultProps> = ({
  id,
  name,
  asset,
  apy,
  tvl,
  balance,
  walletBalance,
  icon,
  strategyType,
  onDeposit,
  onWithdraw,
  shares,
}) => {
  return (
    <Card className="group relative h-full overflow-hidden glass-panel glass-rim transition-all duration-500 hover:shadow-[0_20px_50px_rgba(34,197,94,0.15)] hover:-translate-y-1.5 border-emerald-500/10 dark:border-emerald-500/5">
      {/* Premium Shimmer Effect on Hover */}
      <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-10 duration-700 pointer-events-none" />
      
      <CardHeader className="relative pb-4">
        <Stack direction="row" justify="between" align="start">
          <div className="flex items-center gap-4">
            <div className="relative">
               <div className="absolute inset-0 bg-harvest-green-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-gray-800 text-harvest-green-600 shadow-xl ring-1 ring-gray-100 dark:ring-gray-700 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                 {icon}
               </div>
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-zinc-50 leading-none">
                {name}
              </h3>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 dark:bg-white/5 rounded-md border border-gray-200 dark:border-white/10">
                   <Activity className="w-2.5 h-2.5 text-gray-400" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-500">
                     {asset} Portfolio
                   </span>
                </div>
              </div>
            </div>
          </div>
          <Tooltip content={getTermTooltip("apy")} position="top">
            <div className="cursor-help flex flex-col items-end">
               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">Yield</span>
               <div className="flex items-center gap-1 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-sm">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-lg font-black text-emerald-500 tracking-tighter">{apy}%</span>
               </div>
            </div>
          </Tooltip>
        </Stack>
      </CardHeader>

      <CardBody className="pt-2">
        <Stack gap="xl">
          <div className="grid grid-cols-2 gap-5">
            <div className="relative overflow-hidden rounded-[1.5rem] bg-gray-50/50 dark:bg-white/5 p-5 border border-gray-100 dark:border-white/5 transition-all duration-500 group-hover:bg-white dark:group-hover:bg-white/10 shadow-inner">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500">
                Total Liquidity
              </p>
              <div className="flex items-baseline gap-1">
                <p className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  {tvl}
                </p>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">TVL</span>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[1.5rem] bg-emerald-500/5 p-5 border border-emerald-500/10 transition-all duration-500 group-hover:bg-emerald-500/10 shadow-inner">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600/60 dark:text-emerald-500/60">
                Personal Capital
              </p>
              <div className="flex items-baseline gap-1">
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {balance}
                </p>
                <span className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-500/60 uppercase tracking-widest">
                  {asset}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-5 rounded-2xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800">
             <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md">
                   <Wallet className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Available to Deploy</p>
                   <p className="text-sm font-black text-gray-900 dark:text-white">{walletBalance} {asset}</p>
                </div>
             </div>
             <div className="flex items-center gap-1.5 text-emerald-500/50">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">Protected</span>
             </div>
          </div>
        </Stack>
      </CardBody>

      <CardFooter className="flex gap-4 p-6 pt-2 bg-transparent">
        <Button
          variant="primary"
          fullWidth
          size="lg"
          onClick={() => onDeposit(id)}
          className="rounded-2xl py-7 text-lg font-black shadow-xl shadow-harvest-green-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] animate-shimmer"
        >
          <div className="flex items-center gap-2">
            <span>Deposit</span>
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </Button>
        <Button
          variant="outline"
          fullWidth
          size="lg"
          onClick={() => onWithdraw(id)}
          className="rounded-2xl py-7 text-lg font-black border-2 border-gray-100 dark:border-gray-800 transition-all hover:bg-white dark:hover:bg-gray-800 hover:text-harvest-green-600 hover:border-harvest-green-500/30"
        >
          <div className="flex items-center gap-2">
            <span>Withdraw</span>
            <ArrowDownLeft className="h-5 w-5" />
          </div>
        </Button>
      </CardFooter>
      <div className="px-6 pb-6 pt-0 text-center">
        <Link 
          href={`/strategies/${id}`}
          className="inline-flex items-center justify-center gap-2 text-[10px] font-black text-gray-400 hover:text-harvest-green-600 transition-all uppercase tracking-[0.2em] group/link"
        >
          <span>Deep Strategy Analysis</span>
          <ArrowUpRight className="w-3 h-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
        </Link>
      </div>
    </Card>
  );
};