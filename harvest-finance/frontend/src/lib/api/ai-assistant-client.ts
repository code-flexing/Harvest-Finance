import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

export interface FarmContext {
  selectedCrop?: string;
  currentSeason?: string;
  vaultBalance?: number;
  totalDeposits?: number;
  totalRewards?: number;
  currentMilestone?: string;
  vaultTarget?: number;
  progressPercent?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  context?: FarmContext;
  history?: ChatMessage[];
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
  timestamp: string;
}

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const { data } = await apiClient.post<ChatResponse>(
    '/api/v1/ai-assistant/chat',
    request,
  );
  return data;
}
