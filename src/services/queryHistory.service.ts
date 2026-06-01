import api from './api';
import { QueryHistory, CreateQueryHistoryDto, QueryHistoryFilter, PaginatedQueryHistory } from '@/types/query-history';

class QueryHistoryService {
  async saveQuery(dto: CreateQueryHistoryDto): Promise<QueryHistory> {
    const response = await api.post('/ai/history', dto);
    return response.data;
  }

  async getHistory(filter?: QueryHistoryFilter): Promise<PaginatedQueryHistory> {
    const response = await api.get('/ai/history', { params: filter });
    return response.data;
  }

  async getQueryById(id: string): Promise<QueryHistory> {
    const response = await api.get(`/ai/history/${id}`);
    return response.data;
  }

  async deleteQuery(id: string): Promise<void> {
    await api.delete(`/ai/history/${id}`);
  }

  async clearAllHistory(): Promise<void> {
    await api.delete('/ai/history');
  }
}

export const queryHistoryService = new QueryHistoryService();
