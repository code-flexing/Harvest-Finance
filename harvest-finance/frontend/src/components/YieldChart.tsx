'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { vaultApi, ApyHistoryData } from '@/lib/api/vault-client';
import { format } from 'date-fns';

interface ApyDataPoint {
  date: string;
  apy: number;
  timestamp: number;
}

interface YieldChartProps {
  vaultId?: string;
  timeRange?: '7d' | '30d' | '90d' | 'all';
  height?: number;
  showArea?: boolean;
}

export const YieldChart: React.FC<YieldChartProps> = ({
  vaultId,
  timeRange = '30d',
  height = 300,
  showArea = true,
}) => {
  const [data, setData] = useState<ApyDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApyData();
  }, [vaultId, timeRange]);

  const fetchApyData = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiData = await vaultApi.getApyHistory({ vaultId, timeRange });

      // Transform API response to include formatted date and timestamp
      const chartData: ApyDataPoint[] = apiData.map((item) => ({
        date: format(new Date(item.date), 'MMM dd'),
        apy: item.apy || 0,
        timestamp: new Date(item.date).getTime(),
      }));

      setData(chartData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const formatApy = (value: number) => `${value.toFixed(2)}%`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-sm text-green-600">
            APY: {formatApy(data.apy)}
          </p>
          <p className="text-xs text-gray-500">
            {format(new Date(data.timestamp), 'PPP')}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center text-red-500">
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchApyData}
            className="mt-2 text-xs text-blue-500 hover:text-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    );
  }

  const ChartComponent = showArea ? AreaChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showArea && (
          <defs>
            <linearGradient id="apyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
            </linearGradient>
          </defs>
        )}
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
          tickFormatter={formatApy}
          domain={['dataMin - 0.5', 'dataMax + 0.5']}
        />
        <Tooltip content={<CustomTooltip />} />
        {showArea ? (
          <Area
            type="monotone"
            dataKey="apy"
            stroke="#10B981"
            fillOpacity={1}
            fill="url(#apyGradient)"
            strokeWidth={2}
            name="APY"
          />
        ) : (
          <Line
            type="monotone"
            dataKey="apy"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ r: 3, fill: '#10B981' }}
            name="APY"
          />
        )}
      </ChartComponent>
    </ResponsiveContainer>
  );
};