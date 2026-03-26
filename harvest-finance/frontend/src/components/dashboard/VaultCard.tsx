'use client';

import React from 'react';
import { Card, CardHeader, CardBody, CardFooter, Button, Badge, Stack, Inline } from '@/components/ui';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export interface VaultProps {
  id: string;
  name: string;
  asset: string;
  apy: string;
  tvl: string;
  balance: string;
  walletBalance: string;
  icon: React.ReactNode;
  onDeposit: (vaultId: string) => void;
  onWithdraw: (vaultId: string) => void;
}

export const VaultCard: React.FC<VaultProps> = ({
  id,
  name,
  asset,
  apy,
  tvl,
  balance,
  walletBalance,
  icon,
  onDeposit,
  onWithdraw,
}) => {
  return (
    <Card hoverable className="h-full border border-gray-100 dark:border-zinc-800">
      <CardHeader className="pb-2">
        <Stack direction="row" justify="between" align="start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-harvest-green-50 dark:bg-harvest-green-950/30 flex items-center justify-center text-harvest-green-600 dark:text-harvest-green-400">
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-50">{name}</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400">{asset} Vault</p>
            </div>
          </div>
          <Badge variant="success" isPill className="bg-harvest-green-100 text-harvest-green-800 dark:bg-harvest-green-900/40 dark:text-harvest-green-300">
            {apy} APY
          </Badge>
        </Stack>
      </CardHeader>
      
      <CardBody>
        <Stack gap="md" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-zinc-900/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-zinc-500 uppercase tracking-wider font-semibold mb-1">TVL</p>
              <p className="text-base font-bold text-gray-900 dark:text-zinc-100">{tvl}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-zinc-900/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-zinc-500 uppercase tracking-wider font-semibold mb-1">My Balance</p>
              <div className="flex items-baseline gap-1">
                <p className="text-base font-bold text-harvest-green-600 dark:text-harvest-green-400">{balance}</p>
                <span className="text-xs text-gray-400 dark:text-zinc-500">{asset}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
            <Wallet className="w-4 h-4 text-gray-400" />
            <span>Wallet: {walletBalance} {asset}</span>
          </div>
        </Stack>
      </CardBody>
      
      <CardFooter divider className="pt-4 mt-6">
        <Button 
          variant="primary" 
          fullWidth 
          leftIcon={<ArrowUpRight className="w-4 h-4" />}
          onClick={() => onDeposit(id)}
          className="bg-harvest-green-600 hover:bg-harvest-green-700 text-white"
        >
          Deposit
        </Button>
        <Button 
          variant="outline" 
          fullWidth 
          leftIcon={<ArrowDownLeft className="w-4 h-4" />}
          onClick={() => onWithdraw(id)}
          className="border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900"
        >
          Withdraw
        </Button>
      </CardFooter>
    </Card>
  );
};