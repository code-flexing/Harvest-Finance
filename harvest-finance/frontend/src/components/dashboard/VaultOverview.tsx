"use client";

import React from "react";
import { Database, Coins, TrendingUp, ShieldCheck, Activity } from "lucide-react";
import { VaultCard, VaultProps } from "./VaultCard";
import { useTranslation } from "react-i18next";
import { Badge, Stack } from "@/components/ui";

const mockVaults: VaultProps[] = [
  {
    id: "1",
    name: "USDC Stable Yield",
    asset: "USDC",
    apy: "12.5%",
    tvl: "$1.2M",
    balance: "$4,280.00",
    walletBalance: "$1,120.00",
    icon: <Database className="w-5 h-5" />,
    riskLevel: "Low",
    onDeposit: () => undefined,
    onWithdraw: () => undefined,
  },
  {
    id: "2",
    name: "ETH Staking Vault",
    asset: "ETH",
    apy: "4.8%",
    tvl: "$4.5M",
    balance: "$2,920.00",
    walletBalance: "$540.00",
    icon: <Coins className="w-5 h-5" />,
    riskLevel: "Medium",
    onDeposit: () => undefined,
    onWithdraw: () => undefined,
  },
  {
    id: "3",
    name: "Harvest Liquidity",
    asset: "HARV",
    apy: "24.2%",
    tvl: "$820K",
    balance: "$1,640.00",
    walletBalance: "$390.00",
    icon: <TrendingUp className="w-5 h-5" />,
    riskLevel: "High",
    onDeposit: () => undefined,
    onWithdraw: () => undefined,
  },
];

export function VaultOverview() {
  const { t } = useTranslation();
  return (
    <section className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">Vault Aggregator v2.0</span>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
             Active Yield Engines
           </h2>
           <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium max-w-xl">
             Select a protocol to deploy capital. Our algorithmically managed vaults optimize for the highest risk-adjusted yield across the Stellar ecosystem.
           </p>
        </div>
        <div className="flex items-center gap-4 border-l border-gray-100 dark:border-white/5 pl-6">
           <Stack gap="none">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Network APY</p>
              <p className="text-2xl font-black text-emerald-500 tracking-tighter">14.2% Avg</p>
           </Stack>
           <div className="h-10 w-[1px] bg-gray-100 dark:bg-white/5 mx-2" />
           <Stack gap="none">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Security Score</p>
              <div className="flex items-center gap-1.5">
                 <ShieldCheck className="w-4 h-4 text-emerald-500" />
                 <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">A+</p>
              </div>
           </Stack>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {mockVaults.map((vault) => (
          <VaultCard key={vault.id} {...vault} />
        ))}
      </div>
    </section>
  );
}
