import apiClient from '../api-client';
import type { OperatorReputation } from '@/types/operator';

export const operatorApi = {
  getReputation: async (operatorId: string): Promise<OperatorReputation> => {
    const response = await apiClient.get(`/api/v1/operators/${operatorId}/reputation`);
    return response.data;
  },
};
