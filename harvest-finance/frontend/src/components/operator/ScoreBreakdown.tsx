'use client';

import React from 'react';
import { Card, CardBody, cn } from '@/components/ui';
import { TrendingUp, Clock, Vote, ShieldAlert } from 'lucide-react';

interface ScoreBreakdownProps {
  components: {
    vaultPerformance: number;
    operatorTenure: number;
    governanceParticipation: number;
    securityIncidents: number;
  };
}

const COMPONENT_META = [
  {
    key: 'vaultPerformance' as const,
    label: 'Vault Performance',
    icon: TrendingUp,
    description: 'Historical yield consistency and ROI',
  },
  {
    key: 'operatorTenure' as const,
    label: 'Operator Tenure',
    icon: Clock,
    description: 'Length and consistency of operation',
  },
  {
    key: 'governanceParticipation' as const,
    label: 'Governance',
    icon: Vote,
    description: 'Community governance engagement',
  },
  {
    key: 'securityIncidents' as const,
    label: 'Security Record',
    icon: ShieldAlert,
    description: 'Absence of security incidents',
  },
];

function componentColor(score: number): string {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-lime-500';
  if (score >= 40) return 'text-yellow-500';
  if (score >= 20) return 'text-orange-500';
  return 'text-red-500';
}

function barColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-lime-500';
  if (score >= 40) return 'bg-yellow-500';
  if (score >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ components }) => {
  return (
    <div className="space-y-3">
      {COMPONENT_META.map(({ key, label, icon: Icon, description }) => {
        const score = components[key];
        return (
          <Card key={key} variant="flat" padding="md" className="border border-gray-100 dark:border-white/5">
            <CardBody>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                      {label}
                    </span>
                    <span className={cn('text-sm font-black', componentColor(score))}>
                      {Math.round(score)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-700', barColor(score))}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    {description}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
};
