'use client';

import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  BarChart
} from 'recharts';
import { Card, CardHeader, CardBody, Tooltip } from '@/components/ui';
import { format } from 'date-fns';
import { Info } from 'lucide-react';
import { getTermTooltip } from '@/lib/defi-terms';

interface YieldAnalyticsData {
  contractId: string;
  date: string;
  totalAssets: string;
  totalShares: string;
  hardworkEventsCount: number;
  sevenDayApy: number | null;
  dailyApy: number | null;
  pricePerShare: string;
  pricePerSharePrevious: string | null;
  volume24h: string;
}

interface ContractApyData {
  contractId: string;
  apy: number | null;
}

interface YieldAnalyticsPanelProps {
  contractId?: string;
  timeRange?: number; // days
}

export const YieldAnalyticsPanel: React.FC<YieldAnalyticsPanelProps> = ({ 
  contractId,
  timeRange = 30 
}) => {
  const [analyticsData, setAnalyticsData] = useState<YieldAnalyticsData[]>([]);
  const [currentApys, setCurrentApys] = useState<ContractApyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchYieldAnalytics();
    fetchCurrentApys();
  }, [contractId, timeRange]);

  const fetchYieldAnalytics = async () => {
    try {
      setLoading(true);
      const url = contractId 
        ? `/api/v1/yield-analytics/contract/${contractId}?days=${timeRange}`
        : `/api/v1/yield-analytics?days=${timeRange}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch yield analytics');
      }
      
      const data = await response.json();
      setAnalyticsData(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentApys = async () => {
    try {
      const response = await fetch('/api/v1/yield-analytics/current-apy');
      if (!response.ok) {
        throw new Error('Failed to fetch current APYs');
      }
      
      const data = await response.json();
      setCurrentApys(data || []);
    } catch (err) {
      console.error('Error fetching current APYs:', err);
    }
  };

  const processChartData = () => {
    return analyticsData.map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      fullDate: item.date,
      sevenDayApy: item.sevenDayApy || 0,
      dailyApy: item.dailyApy || 0,
      volume24h: parseFloat(item.volume24h) || 0,
      hardworkEvents: item.hardworkEventsCount,
      pricePerShare: parseFloat(item.pricePerShare) || 0,
      totalAssets: parseFloat(item.totalAssets) || 0,
    }));
  };

  const getCurrentApy = () => {
    if (contractId) {
      const contractData = currentApys.find(c => c.contractId === contractId);
      return contractData?.apy || 0;
    }
    
    // Return average APY across all contracts if no specific contract
    const validApys = currentApys.filter(c => c.apy !== null);
    if (validApys.length === 0) return 0;
    
    const sum = validApys.reduce((acc, c) => acc + c.apy!, 0);
    return sum / validApys.length;
  };

  const formatApy = (apy: number) => {
    return `${apy.toFixed(2)}%`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(2)}K`;
    }
    return `$${volume.toFixed(2)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('APY') ? formatApy(entry.value) : formatVolume(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card variant="default" className="h-[400px]">
        <CardHeader title="Yield Analytics" />
        <CardBody className="flex items-center justify-center h-[320px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="default" className="h-[400px]">
        <CardHeader title="Yield Analytics" />
        <CardBody className="flex items-center justify-center h-[320px]">
          <div className="text-center">
            <p className="text-red-500 mb-2">Error loading yield analytics</p>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const chartData = processChartData();
  const currentApy = getCurrentApy();

  return (
    <div className="space-y-4">
      {/* Current APY Summary */}
      <Card variant="default">
        <CardHeader 
          title={
            <Tooltip content={getTermTooltip('apy')} position="bottom">
              <span className="flex items-center gap-1 cursor-help">
                Current 7-Day APY
                <Info className="w-4 h-4 opacity-60" />
              </span>
            </Tooltip>
          } 
        />
        <CardBody>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-green-600">
              {formatApy(currentApy)}
            </span>
            <span className="text-sm text-gray-500">annualized</span>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Based on {currentApys.length} contract{currentApys.length !== 1 ? 's' : ''}
          </div>
        </CardBody>
      </Card>

      {/* 7-Day APY Chart */}
      <Card variant="default" className="h-[400px]">
        <CardHeader title="7-Day Rolling APY Trend" />
        <CardBody className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorApy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="sevenDayApy" 
                stroke="#10B981" 
                fillOpacity={1} 
                fill="url(#colorApy)" 
                strokeWidth={3}
                name="7-Day APY"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Volume and Events Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="default" className="h-[300px]">
          <CardHeader title="24h Volume" />
          <CardBody className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  tickFormatter={(value) => formatVolume(value)}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="volume24h" 
                  fill="#3B82F6" 
                  radius={[4, 4, 0, 0]} 
                  barSize={20}
                  name="24h Volume"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card variant="default" className="h-[300px]">
          <CardHeader title="HardWork Events" />
          <CardBody className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="hardworkEvents" 
                  stroke="#F59E0B" 
                  strokeWidth={2} 
                  dot={{ r: 3, fill: '#F59E0B' }}
                  name="HardWork Events"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Contract Details */}
      {contractId && (
        <Card variant="default">
          <CardHeader title="Contract Details" />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Contract ID</p>
                <p className="font-mono text-sm truncate">{contractId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Assets</p>
                <p className="font-semibold">
                  {chartData.length > 0 ? formatVolume(chartData[chartData.length - 1].totalAssets) : '$0'}
                </p>
              </div>
              <div>
                <Tooltip content={getTermTooltip('price_per_share')} position="top">
                  <p className="text-sm text-gray-600 cursor-help flex items-center gap-1">
                    Price per Share
                    <Info className="w-3 h-3 opacity-60" />
                  </p>
                </Tooltip>
                <p className="font-semibold">
                  {chartData.length > 0 ? chartData[chartData.length - 1].pricePerShare.toFixed(6) : '0'}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
