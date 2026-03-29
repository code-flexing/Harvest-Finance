import React from 'react';
import { Coins, Zap, Leaf, Shield, Database, TrendingUp } from 'lucide-react';
import type { VaultIconKey } from './db';

export function vaultIconFor(key: VaultIconKey): React.ReactNode {
  const className = 'w-6 h-6';
  switch (key) {
    case 'coins':
      return <Coins className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'leaf':
      return <Leaf className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'database':
      return <Database className={className} />;
    case 'trending':
      return <TrendingUp className={className} />;
    default:
      return <Coins className={className} />;
  }
}
