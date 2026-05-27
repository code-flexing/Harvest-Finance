import apiClient from '../api-client';

export interface ApyHistoryData {
  date: string;
  apy: number;
  vaultId?: string;
}

export interface VaultApyHistoryParams {
  vaultId?: string;
  timeRange?: '7d' | '30d' | '90d' | 'all';
}

export const vaultApi = {
  /**
   * Fetch APY history for vault(s)
   */
  getApyHistory: async (params: VaultApyHistoryParams = {}): Promise<ApyHistoryData[]> => {
    const { vaultId, timeRange = '30d' } = params;

    let url = `/api/v1/vaults/apy-history?timeRange=${timeRange}`;
    if (vaultId) {
      url += `&vaultId=${vaultId}`;
    }

    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Get current APY for a specific vault
   */
  getCurrentApy: async (vaultId: string): Promise<number> => {
    const response = await apiClient.get(`/api/v1/vaults/${vaultId}/current-apy`);
    return response.data.apy;
  },

  /**
   * Get APY history for all vaults
   */
  getAllVaultsApyHistory: async (timeRange: '7d' | '30d' | '90d' | 'all' = '30d'): Promise<ApyHistoryData[]> => {
    const response = await apiClient.get(`/api/v1/vaults/apy-history?timeRange=${timeRange}`);
    return response.data;
  },
};