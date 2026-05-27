'use client';

import React, { useState } from 'react';
import { YieldAnalyticsPanel } from '@/components/dashboard/YieldAnalyticsPanel';
import { YieldChart } from '@/components/YieldChart';
import { Card, CardHeader, CardBody } from '@/components/ui';

export default function YieldAnalyticsPage() {
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Convert timeRange string to number for API
  const getTimeRangeDays = (range: '7d' | '30d' | '90d' | 'all'): number => {
    switch (range) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case 'all': return 365; // Use 1 year as "all"
      default: return 30;
    }
  };

  // Mock contract data - in a real app, this would come from an API
  const mockContracts = [
    { id: '', name: 'All Contracts' },
    { id: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', name: 'Main Vault' },
    { id: 'CBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', name: 'Farm Vault #1' },
    { id: 'CCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', name: 'Farm Vault #2' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Yield Analytics
          </h1>
          <p className="text-gray-600">
            Monitor 7-day rolling APYs and performance metrics from HardWork events
          </p>
        </div>

        {/* Controls */}
        <Card variant="default" className="mb-6">
          <CardHeader title="Filters" />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contract-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Contract
                </label>
                <select
                  id="contract-select"
                  value={selectedContract}
                  onChange={(e) => setSelectedContract(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {mockContracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="time-range" className="block text-sm font-medium text-gray-700 mb-2">
                  Time Range
                </label>
                <select
                  id="time-range"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d' | 'all')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* APY Growth Chart */}
        <Card variant="default" className="mb-6">
          <CardHeader title="APY Growth Over Time" />
          <CardBody>
            <YieldChart
              vaultId={selectedContract || undefined}
              timeRange={timeRange}
              height={400}
              showArea={true}
            />
          </CardBody>
        </Card>

        {/* Analytics Panel */}
        <YieldAnalyticsPanel 
          contractId={selectedContract || undefined} 
          timeRange={getTimeRangeDays(timeRange)}
        />
      </div>
    </div>
  );
}
