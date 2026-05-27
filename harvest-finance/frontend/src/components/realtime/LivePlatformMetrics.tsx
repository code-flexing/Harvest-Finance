"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Landmark,
  ArrowDownLeft,
  BarChart3,
  Coins,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Card, CardBody, Stack } from "@/components/ui";
import type {
  PlatformMetrics,
  RecentTransaction,
} from "@/hooks/useRealtimeAnalytics";

interface LivePlatformMetricsProps {
  metrics: PlatformMetrics | null;
  connected: boolean;
  history: PlatformMetrics[];
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const KPI_CARDS = (metrics: PlatformMetrics) => [
  {
    label: "Total Users",
    value: metrics.totalUsers.toString(),
    icon: <Users className="h-5 w-5 text-blue-600" />,
    bg: "bg-blue-50",
  },
  {
    label: "Active Users",
    value: metrics.activeUsers.toString(),
    icon: <Users className="h-5 w-5 text-green-600" />,
    bg: "bg-green-50",
  },
  {
    label: "Total Deposits",
    value: fmt(metrics.totalDeposits),
    icon: <Landmark className="h-5 w-5 text-green-600" />,
    bg: "bg-green-50",
  },
  {
    label: "Total Withdrawals",
    value: fmt(metrics.totalWithdrawals),
    icon: <ArrowDownLeft className="h-5 w-5 text-red-500" />,
    bg: "bg-red-50",
  },
  {
    label: "Active Vaults",
    value: metrics.activeVaults.toString(),
    icon: <BarChart3 className="h-5 w-5 text-purple-600" />,
    bg: "bg-purple-50",
  },
  {
    label: "Total Rewards",
    value: fmt(metrics.totalRewards),
    icon: <Coins className="h-5 w-5 text-amber-600" />,
    bg: "bg-amber-50",
  },
];

function TransactionFeed({
  items,
  label,
}: {
  items: RecentTransaction[];
  label: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">No recent activity</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span className="max-w-[60%] truncate text-gray-600">
                {item.vaultName}
              </span>
              <span className="font-semibold text-gray-900">
                {fmt(item.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const LivePlatformMetrics: React.FC<LivePlatformMetricsProps> = ({
  metrics,
  connected,
  history,
}: LivePlatformMetricsProps) => {
  const sparkData = history.map((entry: PlatformMetrics) => ({
    t: timeLabel(entry.timestamp),
    deposits: entry.totalDeposits,
    users: entry.totalUsers,
  }));

  return (
    <Stack gap="lg">
      <div className="flex items-center gap-2 text-sm">
        {connected ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="font-medium text-green-600">Live</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400">Connecting...</span>
          </>
        )}
        {metrics && (
          <span className="ml-2 text-gray-400">
            Last update: {timeLabel(metrics.timestamp)}
          </span>
        )}
      </div>

      {metrics ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {KPI_CARDS(metrics).map((kpi, index) => (
            <Card key={index} className="border-none shadow-sm">
              <CardBody className="p-3">
                <div
                  className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${kpi.bg}`}
                >
                  {kpi.icon}
                </div>
                <p className="text-xs text-gray-500">{kpi.label}</p>
                <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Waiting for first snapshot...</p>
      )}

      {sparkData.length > 1 && (
        <Card className="border-none shadow-sm">
          <CardBody>
            <p className="mb-3 text-sm font-semibold text-gray-700">
              Deposit trend (live)
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={sparkData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) =>
                    fmt(typeof value === "number" ? value : Number(value ?? 0))
                  }
                  width={60}
                />
                <Tooltip
                  formatter={(value) =>
                    fmt(typeof value === "number" ? value : Number(value ?? 0))
                  }
                />
                <Line
                  type="monotone"
                  dataKey="deposits"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {metrics && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardBody>
              <TransactionFeed
                items={metrics.recentDeposits}
                label="Recent Deposits"
              />
            </CardBody>
          </Card>
          <Card className="border-none shadow-sm">
            <CardBody>
              <TransactionFeed
                items={metrics.recentWithdrawals}
                label="Recent Withdrawals"
              />
            </CardBody>
          </Card>
        </div>
      )}
    </Stack>
  );
};
