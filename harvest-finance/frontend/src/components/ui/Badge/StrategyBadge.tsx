import React from 'react';
import { ShieldCheck, Users, FlaskConical } from 'lucide-react';
import { Badge } from './Badge';
import { StrategyType } from '@/types/vault';

const config: Record<StrategyType, { variant: 'success' | 'info' | 'warning'; icon: React.ReactNode; title: string }> = {
  Audited: {
    variant: 'success',
    icon: <ShieldCheck className="w-3 h-3" />,
    title: 'Smart contract audited by a third party',
  },
  Community: {
    variant: 'info',
    icon: <Users className="w-3 h-3" />,
    title: 'Community-governed strategy',
  },
  Experimental: {
    variant: 'warning',
    icon: <FlaskConical className="w-3 h-3" />,
    title: 'New or unaudited strategy — use with caution',
  },
};

export const StrategyBadge: React.FC<{ strategyType: StrategyType }> = ({ strategyType }) => {
  const { variant, icon, title } = config[strategyType];
  return (
    <Badge variant={variant} size="sm" isPill title={title} className="inline-flex items-center gap-1">
      {icon}
      {strategyType}
    </Badge>
  );
};
