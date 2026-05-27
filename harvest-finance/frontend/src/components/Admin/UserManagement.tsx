'use client';

import React from 'react';
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
  Stack,
  Input,
} from '@/components/ui';
import { Search, UserPlus, Lock, Unlock } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

interface UserManagementProps {
  users: User[];
  search: string;
  onSearch: (value: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => Promise<void>;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, search, onSearch, onToggleStatus }) => {
  return (
    <Card variant="default">
      <CardHeader
        title="User Management"
        subtitle="View users, search by email or role, and suspend or reactivate accounts."
        action={
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => onSearch(event.target.value)}
              placeholder="Search users..."
              className="max-w-xs"
              leftIcon={<Search className="w-4 h-4 text-gray-400" />}
            />
          </div>
        }
      />
      <CardBody className="pt-6 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    <Stack align="center" gap="sm">
                    <UserPlus className="w-8 h-8 text-gray-300" />
                    <p>No users matched your search.</p>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: User) => (
                <TableRow key={user.id}>
                   <TableCell>
                     <div className="flex flex-col">
                       <span className="font-medium text-gray-900">
                         {(user.firstName || 'Unknown')} {(user.lastName || '')}
                       </span>
                       <span className="text-xs text-gray-500">Joined {new Date(user.createdAt).toLocaleDateString('en-US')}</span>
                     </div>
                   </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role.toLowerCase()}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'success' : 'error'} size="sm">
                      {user.isActive ? 'Active' : 'Suspended'}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.lastLogin ? new Date(user.lastLogin).toLocaleString('en-US') : 'Never'}</TableCell>
                  <TableCell className="text-right">
                    <Inline align="center" gap="sm" className="justify-end">
                      <Button
                        size="xs"
                        variant={user.isActive ? 'outline' : 'secondary'}
                        onClick={() => onToggleStatus(user.id, !user.isActive)}
                      >
                        {user.isActive ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                        <span className="ml-1">{user.isActive ? 'Suspend' : 'Reactivate'}</span>
                      </Button>
                    </Inline>
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
