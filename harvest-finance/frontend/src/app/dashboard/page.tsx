"use client";

import React from "react";
import { VaultOverview } from "@/components/dashboard/VaultOverview";
import { TrendingUp, Wallet, ArrowRight, Activity, ShieldCheck, Zap, ArrowUpRight } from "lucide-react";
import { Card, CardBody, Button, Badge, cn, DashboardSkeleton } from "@/components/ui";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

const chartData = [
    { name: "Mon", value: 32000 },
    { name: "Tue", value: 34000 },
    { name: "Wed", value: 33000 },
    { name: "Thu", value: 36000 },
    { name: "Fri", value: 42000 },
    { name: "Sat", value: 41000 },
    { name: "Sun", value: 45231 },
];

const positions = [
    {
        vault: "USDC Alpha Reserve",
        tvl: "$12,231",
        apy: "8.45%",
        earnings: "$34.21",
    },
    { vault: "XLM/USDC Harvest", tvl: "$9,876", apy: "6.72%", earnings: "$18.76" },
    { vault: "Stellar Aqua Pool", tvl: "$7,231", apy: "7.91%", earnings: "$15.32" },
];

export default function DashboardPage() {
    const { isLoading } = useQuery({
        queryKey: ["dashboard-init"],
        queryFn: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500));
            return true;
        }
    });

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="space-y-12 pb-20 animate-in fade-in duration-1000">
            {/* Dashboard Header - Premium Branding */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-gray-100 dark:border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                       <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">Institutional Interface</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tighter">
                        Portfolio Hub
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        Real-time analytics for your capital deployment on the Stellar network.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                       <ShieldCheck className="w-4 h-4 text-emerald-500" />
                       <span className="text-xs font-black uppercase tracking-widest text-gray-400">Security Verified</span>
                    </div>
                    <Button
                        variant="primary"
                        size="lg"
                        className="rounded-2xl px-8 py-7 text-lg font-black shadow-2xl shadow-harvest-green-500/20 animate-shimmer"
                    >
                        <div className="flex items-center gap-2">
                           <Wallet className="w-5 h-5" />
                           <span>Sync Wallet</span>
                        </div>
                    </Button>
                </div>
            </div>

            {/* Premium Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Assets Locked", value: "$45,231.89", sub: "+3.89% (24h)", icon: Wallet, color: "emerald" },
                  { label: "Accrued Harvesting", value: "$1,452.12", sub: "+$42.10 today", icon: TrendingUp, color: "harvest-green" },
                  { label: "Active Deployments", value: "07", sub: "Across 4 protocols", icon: Activity, color: "emerald" },
                  { label: "Network Gas Savings", value: "142 XLM", sub: "Via Soroban batching", icon: Zap, color: "harvest-green" }
                ].map((stat, i) => (
                  <Card key={i} className="group glass-panel glass-rim p-6 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                     <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-10 pointer-events-none" />
                     <div className="flex justify-between items-start mb-6">
                        <div className={cn(
                          "p-3 rounded-2xl border transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-lg",
                          stat.color === 'emerald' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-harvest-green-500/10 border-harvest-green-500/20 text-harvest-green-600"
                        )}>
                           <stat.icon className="w-6 h-6" />
                        </div>
                        <Badge variant="outline" className="text-[9px] font-black tracking-[0.2em] uppercase border-gray-100 dark:border-white/5 opacity-50">Realtime</Badge>
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 mb-1">{stat.label}</p>
                     <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{stat.value}</p>
                     <p className={cn(
                       "text-xs font-bold mt-2",
                       stat.sub.startsWith('+') ? "text-emerald-500" : "text-gray-400"
                     )}>{stat.sub}</p>
                  </Card>
                ))}
            </div>

            {/* Analysis Center */}
            <section className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 glass-panel glass-rim p-8 overflow-hidden">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">Analytics Engine</p>
                           <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">Performance Forecast</h3>
                        </div>
                        <div className="flex gap-2">
                           {['7D', '1M', '3M', 'ALL'].map(t => (
                             <button key={t} className="px-3 py-1.5 rounded-lg text-[10px] font-black text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all">{t}</button>
                           ))}
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis 
                                  dataKey="name" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}}
                                />
                                <YAxis hide />
                                <Tooltip 
                                  contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#fff',
                                    fontWeight: '900'
                                  }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#16a34a"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="glass-panel glass-rim p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">Live Positions</p>
                           <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">Active Vaults</h3>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-xl px-4 py-2 text-[10px] font-black">
                           MANAGE ALL
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {positions.map((p, i) => (
                            <div
                                key={i}
                                className="group/item flex justify-between items-center p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent hover:border-gray-100 dark:hover:border-white/10 transition-all duration-300 cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-xl bg-harvest-green-500/10 flex items-center justify-center text-harvest-green-600 transition-transform group-hover/item:scale-110">
                                      <Zap className="w-5 h-5" />
                                   </div>
                                   <div>
                                       <p className="font-black text-gray-900 dark:text-white tracking-tight">
                                           {p.vault}
                                       </p>
                                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                           TVL {p.tvl}
                                       </p>
                                   </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-emerald-500 font-black tracking-tight">
                                        {p.apy}
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        {p.earnings}/d
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-8 p-6 rounded-[2rem] bg-gradient-to-br from-harvest-green-600 to-harvest-green-900 text-white relative overflow-hidden group">
                       <div className="absolute inset-0 animate-shimmer opacity-20 pointer-events-none" />
                       <div className="relative z-10">
                          <h4 className="font-black text-lg tracking-tighter mb-1">Optimal Yield Strategy</h4>
                          <p className="text-xs text-harvest-green-100 font-medium mb-4">You have $2.5k available XLM for deployment.</p>
                          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest group-hover:gap-4 transition-all duration-500 cursor-pointer">
                              Boost My Portfolio <ArrowRight className="w-4 h-4" />
                          </div>
                       </div>
                    </div>
                </Card>
            </section>

            {/* Smart Vault Overview */}
            <div className="pt-12 border-t border-gray-100 dark:border-white/5">
                <div className="mb-10">
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600 dark:text-emerald-400 mb-2">Algorithmically Managed</p>
                   <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Harvest Protocol Vaults</h2>
                </div>
                <VaultOverview />
            </div>
        </div>
    );
}
