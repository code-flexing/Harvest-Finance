'use client';

import React from 'react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Inline,
  Stack
} from '@/components/ui';
import { ArrowUpRight, ArrowDownLeft, Clock, Search } from 'lucide-react';

interface Activity {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  vault: {
    vaultName: string;
  };
}

interface UserActivityProps {
  activities: Activity[];
}

export const UserActivity: React.FC<UserActivityProps> = ({ activities }) => {
  return (
    <Card variant="default">
      <CardHeader 
        title="Recent User Activity" 
        subtitle="Monitor deposits, withdrawals, and system interactions across all vaults."
        action={
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search user or email..." 
              className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-harvest-green-500 focus:border-transparent w-64"
            />
          </div>
        }
      />
      <CardBody className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Vault</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  <Stack align="center" gap="sm">
                    <Clock className="w-8 h-8 text-gray-300" />
                    <p>No recent activity found.</p>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{activity.user.firstName} {activity.user.lastName}</span>
                      <span className="text-xs text-gray-500">{activity.user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Inline gap="xs" align="center">
                      <div className="p-1 rounded-full bg-harvest-green-50 text-harvest-green-600">
                        <ArrowDownLeft className="w-3 h-3" />
                      </div>
                      <span className="text-sm">Deposit</span>
                    </Inline>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {activity.vault.vaultName}
                  </TableCell>
                  <TableCell className="font-semibold text-gray-900">
                    ${Number(activity.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={activity.status === 'CONFIRMED' ? 'success' : 'warning'} size="sm">
                      {activity.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
};
