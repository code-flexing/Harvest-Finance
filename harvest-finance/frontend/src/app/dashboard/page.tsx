"use client";

import React from "react";
import { VaultOverview } from "@/components/dashboard/VaultOverview";
import { SeasonalTipsList, MilestoneNotification } from "@/components/seasonal-tips";
import { AIAssistantChat } from "@/components/ai-assistant";
import { TrendingUp, Wallet, ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSeasonalTipsStore } from "@/hooks/useSeasonalTips";

export default function DashboardPage() {
  const { selectedCrop, selectedSeason, vaultProgress } = useSeasonalTipsStore();

  const aiContext = {
    selectedCrop,
    currentSeason: selectedSeason,
    vaultBalance: vaultProgress.vaultBalance,
    vaultTarget: vaultProgress.vaultTarget,
    progressPercent: vaultProgress.progressPercent,
    currentMilestone: vaultProgress.milestoneReached || undefined,
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Welcome back. Here is an overview of your portfolio.
          </p>
        </div>
        <div className="flex items-center">
          <Button variant="primary" leftIcon={<Wallet className="w-4 h-4" />}>
            Connect Wallet
          </Button>
        </div>
      </div>

      {/* Milestone Notifications */}
      <MilestoneNotification />

      {/* Quick Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card variant="default">
          <CardBody className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-harvest-green-50 flex items-center justify-center text-harvest-green-600 flex-shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Deposits</p>
              <p className="text-2xl font-bold text-gray-900">$0.00</p>
            </div>
          </CardBody>
        </Card>

        <Card variant="default">
          <CardBody className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Rewards</p>
              <p className="text-2xl font-bold text-gray-900">$0.00</p>
            </div>
          </CardBody>
        </Card>

        {/* Optional Action Card */}
        <Card
          variant="default"
          className="hidden lg:block bg-gradient-to-br from-harvest-green-600 to-harvest-green-800 text-white border-none"
        >
          <CardBody className="p-5 flex flex-col justify-center h-full">
            <h3 className="font-semibold text-lg mb-1">Discover Vaults</h3>
            <p className="text-harvest-green-100 text-sm mb-3">
              Earn yield on your crypto assets safely.
            </p>
            <div className="flex items-center text-sm font-medium hover:text-harvest-green-200 cursor-pointer transition-colors w-max">
              Explore now <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Seasonal Tips Section */}
      <div className="pt-4 border-t border-gray-200">
        <SeasonalTipsList showFilters={true} />
      </div>

      {/* Main Content Sections */}
      <div className="pt-4 border-t border-gray-200">
        <VaultOverview />
      </div>

      {/* AI Assistant */}
      <AIAssistantChat context={aiContext} />
    </div>
  );
}
