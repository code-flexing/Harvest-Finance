'use client';

import React, { useState } from 'react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell,
  Button,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Inline,
  Stack
} from '@/components/ui';
import { Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';

interface Vault {
  id: string;
  vaultName: string;
  type: string;
  status: string;
  interestRate: number;
  totalDeposits: number;
  maxCapacity: number;
}

interface VaultManagementProps {
  vaults: Vault[];
  onCreate: () => void;
  onEdit: (vault: Vault) => void;
  onDelete: (id: string) => void;
}

export const VaultManagement: React.FC<VaultManagementProps> = ({ vaults, onCreate, onEdit, onDelete }) => {
  return (
    <Card variant="default">
      <CardHeader 
        title="Vault Management" 
        subtitle="Create, update, and manage agricultural investment vaults."
        action={
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={onCreate}>
            New Vault
          </Button>
        }
      />
      <CardBody className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vault Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>APY</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vaults.map((vault) => (
              <TableRow key={vault.id}>
                <TableCell className="font-medium text-gray-900">{vault.vaultName}</TableCell>
                <TableCell>
                  <Badge variant="default" className="capitalize">
                    {vault.type.replace(/_/g, ' ').toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge status={vault.status} />
                </TableCell>
                <TableCell className="text-harvest-green-700 font-semibold">
                  {vault.interestRate}%
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 w-32">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{Math.round((vault.totalDeposits / vault.maxCapacity) * 100)}%</span>
                      <span>${vault.maxCapacity / 1000}k</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div 
                        className="bg-harvest-green-500 h-1.5 rounded-full" 
                        style={{ width: `${Math.min(100, (vault.totalDeposits / vault.maxCapacity) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Inline align="center" gap="sm" className="justify-end">
                    <Button variant="ghost" size="xs" onClick={() => onEdit(vault)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="xs" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(vault.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Inline>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
};

// Helper component for status badges
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getVariant = () => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'FULL_CAPACITY': return 'warning';
      case 'INACTIVE': return 'neutral';
      case 'FROZEN': return 'error';
      default: return 'neutral';
    }
  };
  
  return (
    <Badge variant={getVariant()}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
};
