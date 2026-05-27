'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  Inline,
  StrategyBadge,
  Tooltip,
} from '@/components/ui';
import { 
  ArrowUpDown, 
  ChevronUp, 
  ChevronDown, 
  Coins, 
  Zap, 
  Leaf, 
  Shield,
  Info,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Vault } from '@/types/vault';
import { 
  sortVaults, 
  SortKey, 
  SortDirection, 
  formatCurrency, 
  formatPercentage, 
  getRiskVariant 
} from '@/lib/vault-utils';
import { getTermTooltip } from '@/lib/defi-terms';

interface VaultTableProps {
  vaults: Vault[];
  onDeposit: (vaultId: string) => void;
  onWithdraw: (vaultId: string) => void;
}

export const VaultTable: React.FC<VaultTableProps> = ({
  vaults,
  onDeposit,
  onWithdraw,
}) => {
  const { t } = useTranslation();
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'tvl',
    direction: 'desc',
  });

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedVaults = useMemo(() => {
    return sortVaults(vaults, sortConfig.key, sortConfig.direction);
  }, [vaults, sortConfig]);

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="ml-2 h-4 w-4 text-harvest-green-600" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4 text-harvest-green-600" />
    );
  };

  const getVaultIcon = (iconName: string | undefined) => {
    switch (iconName) {
      case 'Coins': return <Coins className="w-5 h-5" />;
      case 'Zap': return <Zap className="w-5 h-5" />;
      case 'Leaf': return <Leaf className="w-5 h-5" />;
      case 'Shield': return <Shield className="w-5 h-5" />;
      default: return <Coins className="w-5 h-5" />;
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white dark:border-[rgba(141,187,85,0.15)] dark:bg-[#162a1a] overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1a3020] transition-colors"
              onClick={() => handleSort('name')}
            >
              <Inline gap="none" align="center">
                <span>{t('dashboard.vault_name')}</span>
                {renderSortIcon('name')}
              </Inline>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1a3020] transition-colors"
              onClick={() => handleSort('apy')}
            >
              <Inline gap="none" align="center">
                <Tooltip content={getTermTooltip('apy')} position="bottom">
                  <span className="flex items-center gap-1 cursor-help">
                    <span>{t('dashboard.apy')}</span>
                    <Info className="w-3 h-3 opacity-60" />
                  </span>
                </Tooltip>
                {renderSortIcon('apy')}
              </Inline>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1a3020] transition-colors"
              onClick={() => handleSort('tvl')}
            >
              <Inline gap="none" align="center">
                <Tooltip content={getTermTooltip('tvl')} position="bottom">
                  <span className="flex items-center gap-1 cursor-help">
                    <span>{t('dashboard.tvl')}</span>
                    <Info className="w-3 h-3 opacity-60" />
                  </span>
                </Tooltip>
                {renderSortIcon('tvl')}
              </Inline>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1a3020] transition-colors"
              onClick={() => handleSort('riskLevel')}
            >
              <Inline gap="none" align="center">
                <Tooltip content={getTermTooltip('risk_level')} position="bottom">
                  <span className="flex items-center gap-1 cursor-help">
                    <span>{t('dashboard.risk_level')}</span>
                    <Info className="w-3 h-3 opacity-60" />
                  </span>
                </Tooltip>
                {renderSortIcon('riskLevel')}
              </Inline>
            </TableHead>
            <TableHead>
              <Tooltip content={getTermTooltip('strategy')} position="bottom">
                <span className="flex items-center gap-1 cursor-help">
                  <span>{t('dashboard.strategy')}</span>
                  <Info className="w-3 h-3 opacity-60" />
                </span>
              </Tooltip>
            </TableHead>
            <TableHead className="text-right">{t('dashboard.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedVaults.map((vault) => (
            <TableRow key={vault.id} className="group">
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-harvest-green-50 dark:bg-harvest-green-950/30 flex items-center justify-center text-harvest-green-600 dark:text-harvest-green-400">
                    {vault.icon || getVaultIcon(vault.iconName)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">{vault.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{vault.asset}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="success" isPill className="bg-harvest-green-100 text-harvest-green-800 dark:bg-harvest-green-900/40 dark:text-harvest-green-300 font-bold">
                  {formatPercentage(vault.apy)}
                </Badge>
              </TableCell>
              <TableCell className="font-medium text-gray-700 dark:text-gray-200">
                {formatCurrency(vault.tvl)}
              </TableCell>
              <TableCell>
                <Badge variant={getRiskVariant(vault.riskLevel)} size="sm">
                  {vault.riskLevel}
                </Badge>
              </TableCell>
              <TableCell>
                {vault.strategyType ? <StrategyBadge strategyType={vault.strategyType} /> : <span className="text-gray-400">—</span>}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2 items-center">
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => onDeposit(vault.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-harvest-green-600 hover:bg-harvest-green-700 text-white h-8"
                  >
                    {t('common.deposit')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onWithdraw(vault.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity border-gray-200 dark:border-[rgba(141,187,85,0.25)] text-gray-700 dark:text-gray-200 h-8"
                  >
                    {t('common.withdraw')}
                  </Button>
                </div>
              </TableCell>

            </TableRow>
          ))}
          {sortedVaults.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-gray-500 dark:text-gray-400">
                {t('dashboard.no_vaults_found')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
