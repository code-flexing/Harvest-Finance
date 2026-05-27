'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRealtimeAnalytics } from '@/hooks/useRealtimeAnalytics';
import { FarmerKPIPanel } from '@/components/realtime/FarmerKPIPanel';
import { AlertBanner } from '@/components/realtime/AlertBanner';
import { Container, Stack, ThemeToggle } from '@/components/ui';
import { Activity } from 'lucide-react';

export default function FarmerRealtimePage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { connected, farmerMetrics, alerts, dismissAlert } = useRealtimeAnalytics({
    mode: 'farmer',
    userId: user?.id,
    token,
  });

  return (
    <Container size="xl" className="py-8">
      <Stack gap="xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              My Farm Analytics
              <Activity className="w-5 h-5 text-harvest-green-500 animate-pulse" />
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Live KPIs for your farm vaults and savings</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Alerts */}
        <AlertBanner alerts={alerts} onDismiss={dismissAlert} />

        {/* Farmer KPIs */}
        <FarmerKPIPanel metrics={farmerMetrics} connected={connected} />
      </Stack>
    </Container>
  );
}
