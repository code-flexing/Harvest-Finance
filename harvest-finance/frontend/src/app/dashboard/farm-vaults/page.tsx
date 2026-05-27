"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Badge,
  Stack,
  Inline,
} from "@/components/ui";
import {
  Plus,
  Sprout,
  Wallet,
  ChevronRight,
  Activity,
  Award,
  CircleHelp,
} from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth-store";
import axios from "@/lib/api-client";
import { CreateVaultModal } from "@/components/farm-vaults/CreateVaultModal";
import { FarmVaultCard } from "@/components/farm-vaults/FarmVaultCard";
import { VaultAnalytics } from "@/components/dashboard/VaultAnalytics";
import { VaultMilestones } from "@/components/dashboard/VaultMilestones";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { DepositModal } from "@/components/dashboard/DepositModal";
import { WithdrawModal } from "@/components/dashboard/WithdrawModal";

const mockChartData = [
  { name: "Jan", deposits: 400, withdrawals: 120, growth: 10 },
  { name: "Feb", deposits: 600, withdrawals: 150, growth: 25 },
  { name: "Mar", deposits: 800, withdrawals: 200, growth: 45 },
  { name: "Apr", deposits: 900, withdrawals: 250, growth: 60 },
  { name: "May", deposits: 1100, withdrawals: 300, growth: 75 },
  { name: "Jun", deposits: 1300, withdrawals: 350, growth: 90 },
];

const mockFarmVaults = [
  {
    id: "vault-1",
    name: "Early Season Maize",
    balance: 500,
    targetAmount: 2000,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ACTIVE",
    cropCycle: {
      name: "Maize - Rainy Season",
      durationDays: 120,
      yieldRate: 15,
      icon: "Sprout",
    },
    projections: {
      daysElapsed: 30,
      daysRemaining: 90,
      progressPercentage: 25,
      currentGrowth: 18.75,
      totalProjectedGrowth: 75,
      estimatedTotalAtMaturity: 575,
      milestones: [
        { name: "Seed Funding", target: 25, achieved: true },
        { name: "Early Growth", target: 50, achieved: false },
        { name: "Mid-Season Bloom", target: 75, achieved: false },
        { name: "Harvest Ready", target: 100, achieved: false },
      ],
    },
  },
];

export default function FarmVaultsPage() {
  const { user, token } = useAuthStore();
  const [vaults, setVaults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedVault, setSelectedVault] = useState<any>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const fetchVaults = async () => {
    if (!user) return;
    try {
      const response = await axios.get(
        "http://localhost:3001/api/v1/farm-vaults",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.data && response.data.length > 0) {
        const vData = response.data;
        setVaults(vData);
        if (!selectedVault) setSelectedVault(vData[0]);
      } else {
        setVaults([]);
      }
    } catch (error) {
      console.warn(
        "Backend not available or failed to fetch vaults, using mocks:",
        error,
      );
      setVaults(mockFarmVaults);
      setSelectedVault(mockFarmVaults[0]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVaults();
    const timer = setTimeout(() => setShowAlert(true), 1000);
    return () => clearTimeout(timer);
  }, [user]);

  const activeVault = selectedVault || (vaults.length > 0 ? vaults[0] : null);

  return (
    <div className="space-y-8 pb-10">
      <AlertBanner
        title="Welcome back, Farmer!"
        message="Your 'Early Season Maize' vault has reached the 'Seed Funding' milestone! Check your projections."
        type="success"
        isVisible={showAlert}
        onClose={() => setShowAlert(false)}
      />

      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="success" className="mb-2">
            Farm Vault Dashboard
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-4xl">
            Agricultural Wealth Hub
          </h1>
          <p className="mt-2 max-w-2xl text-lg text-gray-500 dark:text-gray-400">
            Manage your seasonal savings, track growth milestones, and visualize
            your harvest projections in one central place.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {user && <ExportButton userId={user.id} size="md" />}
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={() => setIsCreateModalOpen(true)}
            className="shadow-lg shadow-harvest-green-200"
          >
            New Vault
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-harvest-green-600" />
            <p className="animate-pulse font-medium text-gray-500">
              Growing your dashboard...
            </p>
          </div>
        </div>
      ) : vaults.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          <div className="space-y-8 xl:col-span-2">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <VaultAnalytics
                title="Deposit vs Withdrawal Trends"
                data={mockChartData}
                type="line"
              />
              <VaultAnalytics
                title="Seasonal Growth Projection"
                data={mockChartData}
                type="area"
              />
            </div>

            <Card variant="default">
              <CardHeader
                title="Recent Vault Activity"
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    View All
                  </Button>
                }
              />
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-[rgba(141,187,85,0.12)] bg-gray-50/50 dark:bg-[#162a1a]/50">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Date
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Type
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[rgba(141,187,85,0.08)]">
                      {[1, 2, 3].map((i) => (
                        <tr
                          key={i}
                          className="transition-colors hover:bg-gray-50/50 dark:hover:bg-[#1a3020]/50"
                        >
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                            May {10 + i}, 2024
                          </td>
                          <td className="px-6 py-4">
                            <Inline gap="xs">
                              <div className="h-2 w-2 rounded-full bg-harvest-green-500" />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                Deposit
                              </span>
                            </Inline>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                            $250.00
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="success" size="sm">
                              Confirmed
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>

            <Card
              variant="outlined"
              className="group relative overflow-hidden border-none bg-gradient-to-br from-harvest-green-900 to-harvest-green-800"
            >
              <div className="absolute right-0 top-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-white/10 blur-3xl transition-all duration-700 group-hover:bg-white/20" />
              <CardBody className="relative z-10 p-8">
                <div className="flex flex-col items-center gap-8 md:flex-row">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/30 bg-white/20 shadow-2xl backdrop-blur-md">
                    <Activity className="h-10 w-10 animate-pulse text-white" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="mb-2 text-2xl font-bold text-white">
                      Smart Harvest Intelligence
                    </h3>
                    <p className="max-w-xl text-lg text-harvest-green-100 opacity-90">
                      Our AI-powered seasonal advisor is analyzing your vault
                      performance. Personalized tips and ROI optimizations are
                      coming soon!
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                  >
                    Notify Me
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-8">
            {activeVault && (
              <div className="space-y-6">
                <FarmVaultCard vault={activeVault} onUpdate={fetchVaults} />

                <VaultMilestones
                  progress={activeVault.projections?.progressPercentage || 0}
                  milestones={activeVault.projections?.milestones || []}
                />

                <Card variant="default">
                  <CardHeader title="Quick Actions" />
                  <CardBody>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={() => setIsDepositOpen(true)}
                        leftIcon={<Wallet className="w-4 h-4" />}
                      >
                        Deposit
                      </Button>
                      <Button
                        variant="outline"
                        fullWidth
                        onClick={() => setIsWithdrawOpen(true)}
                      >
                        Withdraw
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}

            {/* Seasonal Info */}
            <Card variant="outlined" className="border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20">

              <CardHeader title="Seasonal Tips" />
              <CardBody>
                <Stack gap="md">
                  <div className="flex gap-3">
                    <Award className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Premium seeds can increase yield by up to 20% in rainy
                      conditions.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Remember to lock in your fertilizer prices before the
                      pre-season ends.
                    </p>
                  </div>
                </Stack>
              </CardBody>
            </Card>
          </div>
        </div>
      ) : (
        <Card variant="default" className="border-2 border-dashed py-20">
          <CardBody className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-harvest-green-50 text-harvest-green-600">
              <Sprout className="h-10 w-10" />
            </div>
            <h3 className="mb-3 text-2xl font-bold text-gray-900">
              Your Farm is Empty
            </h3>
            <p className="mx-auto mb-10 max-w-sm text-lg text-gray-500">
              Start your first savings vault for the upcoming season to unlock
              analytics, milestones, and expert projections.
            </p>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Plus className="w-5 h-5" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Begin Farming Journey
            </Button>
          </CardBody>
        </Card>
      )}

      <CreateVaultModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchVaults}
      />

      {activeVault && (
        <>
          <DepositModal
            isOpen={isDepositOpen}
            onClose={() => setIsDepositOpen(false)}
            vault={activeVault}
            onSuccess={fetchVaults}
          />
          <WithdrawModal
            isOpen={isWithdrawOpen}
            onClose={() => setIsWithdrawOpen(false)}
            vault={activeVault}
            onSuccess={fetchVaults}
          />
        </>
      )}
    </div>
  );
}
