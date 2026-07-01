'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import type { ScoreHistoryPoint } from '@/types/operator';

interface ScoreHistoryChartProps {
  data: ScoreHistoryPoint[];
  height?: number;
}

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#f97316';
  return '#ef4444';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">{label}</p>
        <p className="text-sm font-bold" style={{ color: scoreColor(value) }}>
          Score: {Math.round(value)}
        </p>
      </div>
    );
  }
  return null;
};

export const ScoreHistoryChart: React.FC<ScoreHistoryChartProps> = ({
  data,
  height = 250,
}) => {
  const chartData = data.map((point) => ({
    date: format(new Date(point.date), 'MMM yy'),
    score: point.score,
    timestamp: new Date(point.date).getTime(),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6B7280', fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6B7280', fontSize: 11 }}
          tickFormatter={(v: number) => `${v}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#22c55e"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#scoreGradient)"
          name="Score"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
