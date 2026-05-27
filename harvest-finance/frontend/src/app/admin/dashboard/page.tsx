'use client';

import React, { useState, useEffect, type FormEvent } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/lib/stores/auth-store';
import { 
  Container, 
  Stack, 
  Inline, 
  Button, 
  Card, 
  CardBody, 
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea
} from '@/components/ui';
import { DashboardStats } from '@/components/Admin/DashboardStats';
import { VaultManagement } from '@/components/Admin/VaultManagement';
import { UserManagement } from '@/components/Admin/UserManagement';
import { UserActivity } from '@/components/Admin/UserActivity';
import { AnalyticsCharts } from '@/components/Admin/AnalyticsCharts';
import { LayoutDashboard, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeposits: 0,
    activeUsers: 0,
    totalRewardsDistributed: 0,
    activeVaults: 0,
    averageApy: 0,
    totalWithdrawals: 0,
  });

  const [vaults, setVaults] = useState([]);
  const [activity, setActivity] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<{
    userGrowth: { period: string; value: number }[];
    depositWithdrawTrends: { period: string; deposits: number; withdrawals: number }[];
    vaultDistribution: { type: string; count: number; totalDeposits: number }[];
  }>({
    userGrowth: [],
    depositWithdrawTrends: [],
    vaultDistribution: [],
  });

  // Modal states
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [editingVault, setEditingVault] = useState<any>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const authHeader = { Authorization: `Bearer ${token}` };
      const userQuery = userSearch ? `?search=${encodeURIComponent(userSearch)}` : '';

      const [statsRes, vaultsRes, activityRes, usersRes, analyticsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/stats`, { headers: authHeader }),
        axios.get(`${API_BASE_URL}/admin/vaults`, { headers: authHeader }),
        axios.get(`${API_BASE_URL}/admin/users/activity`, { headers: authHeader }),
        axios.get(`${API_BASE_URL}/admin/users${userQuery}`, { headers: authHeader }),
        axios.get(`${API_BASE_URL}/admin/analytics`, { headers: authHeader }),
      ]);

      setStats({ ...statsRes.data, totalWithdrawals: analyticsRes.data.totalWithdrawals ?? 0 });
      setVaults(vaultsRes.data);
      setActivity(activityRes.data);
      setUsers(usersRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err: any) {
      console.error('Failed to fetch admin data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data. Ensure you have admin privileges.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async (searchValue = '') => {
    if (!token) return;
    try {
      const authHeader = { Authorization: `Bearer ${token}` };
      const userQuery = searchValue ? `?search=${encodeURIComponent(searchValue)}` : '';
      const usersRes = await axios.get(`${API_BASE_URL}/admin/users${userQuery}`, { headers: authHeader });
      setUsers(usersRes.data);
    } catch (err) {
      console.error('Failed to fetch user list:', err);
    }
  };

  useEffect(() => {
    if (!user || user.role?.toString().toLowerCase() !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [user, token, router]);

  const handleCreateVault = () => {
    setEditingVault(null);
    setIsVaultModalOpen(true);
  };

  const handleEditVault = (vault: any) => {
    setEditingVault(vault);
    setIsVaultModalOpen(true);
  };

  const handleDeleteVault = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vault? This action cannot be undone.')) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/admin/vaults/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert('Failed to delete vault');
    }
  };

  const handleUserSearch = async (value: string) => {
    setUserSearch(value);
    await fetchUsers(value);
  };

  const handleToggleUserStatus = async (id: string, isActive: boolean) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/admin/users/${id}/status`,
        { isActive },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await fetchUsers(userSearch);
    } catch (err) {
      alert('Failed to update user status');
    }
  };

  if (isLoading) {
    return (
      <Container size="xl" className="py-20">
        <Stack align="center" gap="lg">
          <RefreshCw className="w-10 h-10 text-harvest-green-600 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading admin dashboard...</p>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" className="py-20">
        <Card variant="outlined" className="max-w-md mx-auto border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20">
          <CardBody>
            <Stack align="center" gap="md">
              <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
              <p className="text-center text-gray-600 dark:text-gray-300">{error}</p>
              <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
            </Stack>
          </CardBody>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="xl" className="py-8">
      <Stack gap="xl">
        {/* Header */}
        <Inline align="center" className="justify-between">
          <Stack gap="xs">
            <Inline gap="sm" align="center">
              <ShieldCheck className="w-8 h-8 text-harvest-green-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Command Center</h1>
            </Inline>
            <p className="text-gray-500 dark:text-gray-400">Monitor platform health and manage investment vaults.</p>
          </Stack>
          <Button 
            variant="outline" 
            leftIcon={<RefreshCw className="w-4 h-4" />} 
            onClick={fetchData}
          >
            Refresh Data
          </Button>
        </Inline>

        {/* Stats Grid */}
        <DashboardStats stats={stats} />

        {/* Analytics Charts */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Platform Analytics</h2>
          <AnalyticsCharts
            userGrowth={analytics.userGrowth}
            depositWithdrawTrends={analytics.depositWithdrawTrends}
            vaultDistribution={analytics.vaultDistribution}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-8">
          <VaultManagement 
            vaults={vaults} 
            onCreate={handleCreateVault}
            onEdit={handleEditVault}
            onDelete={handleDeleteVault}
          />
          
          <UserManagement
            users={users}
            search={userSearch}
            onSearch={handleUserSearch}
            onToggleStatus={handleToggleUserStatus}
          />
          
          <UserActivity activities={activity} />
        </div>
      </Stack>

      <Modal isOpen={isVaultModalOpen} onClose={() => setIsVaultModalOpen(false)} size="lg">
        <ModalHeader title={editingVault ? 'Edit Vault' : 'Create New Vault'} />
        <form onSubmit={async (e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const data = {
            vaultName: formData.get('vaultName'),
            description: formData.get('description'),
            type: formData.get('type'),
            interestRate: Number(formData.get('interestRate')),
            maxCapacity: Number(formData.get('maxCapacity')),
            isPublic: formData.get('isPublic') === 'on',
          };

          try {
            if (editingVault) {
              await axios.patch(`${API_BASE_URL}/admin/vaults/${editingVault.id}`, data, {
                headers: { Authorization: `Bearer ${token}` }
              });
            } else {
              await axios.post(`${API_BASE_URL}/admin/vaults`, data, {
                headers: { Authorization: `Bearer ${token}` }
              });
            }
            setIsVaultModalOpen(false);
            fetchData();
          } catch (err) {
            alert('Failed to save vault');
          }
        }}>
          <ModalBody>
            <Stack gap="md">
              <Input 
                name="vaultName" 
                label="Vault Name" 
                placeholder="e.g. Corn High Yield" 
                defaultValue={editingVault?.vaultName} 
                required 
              />
              <Textarea 
                name="description" 
                label="Description" 
                placeholder="Describe the vault's purpose..." 
                defaultValue={editingVault?.description} 
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Vault Type</label>
                  <select
                    name="type"
                    className="w-full h-10 px-3 text-sm border border-gray-200 dark:border-[rgba(141,187,85,0.25)] rounded-lg bg-white dark:bg-[#1a3020] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-harvest-green-500"
                    defaultValue={editingVault?.type || 'CROP_PRODUCTION'}
                  >
                    <option value="CROP_PRODUCTION">Crop Production</option>
                    <option value="EQUIPMENT_FINANCING">Equipment Financing</option>
                    <option value="LAND_ACQUISITION">Land Acquisition</option>
                    <option value="INSURANCE_FUND">Insurance Fund</option>
                    <option value="EMERGENCY_FUND">Emergency Fund</option>
                  </select>
                </div>
                <Input 
                  name="interestRate" 
                  label="Annual Interest Rate (%)" 
                  type="number" 
                  step="0.1" 
                  defaultValue={editingVault?.interestRate || 5.0} 
                  required 
                />
              </div>
              <Input 
                name="maxCapacity" 
                label="Maximum Capacity ($)" 
                type="number" 
                defaultValue={editingVault?.maxCapacity || 100000} 
                required 
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  name="isPublic" 
                  defaultChecked={editingVault ? editingVault.isPublic : true} 
                  className="rounded border-gray-300 text-harvest-green-600 focus:ring-harvest-green-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">Make this vault public</span>
              </label>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsVaultModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingVault ? 'Update Vault' : 'Create Vault'}</Button>
          </ModalFooter>
        </form>
      </Modal>
    </Container>
  );
}
