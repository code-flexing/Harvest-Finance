'use client';

import { create } from 'zustand';
import {
  sendChatMessage,
  ChatMessage as ApiChatMessage,
  FarmContext,
  ChatResponse,
} from '@/lib/api/ai-assistant-client';

export interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface AIAssistantState {
  messages: ChatEntry[];
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  suggestions: string[];

  sendMessage: (message: string, context?: FarmContext) => Promise<void>;
  useSuggestion: (suggestion: string, context?: FarmContext) => Promise<void>;
  toggleOpen: () => void;
  openChat: () => void;
  closeChat: () => void;
  clearChat: () => void;
  clearError: () => void;
}

let messageCounter = 0;
function generateId(): string {
  messageCounter += 1;
  return `msg-${Date.now()}-${messageCounter}`;
}

function buildHistory(messages: ChatEntry[]): ApiChatMessage[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content }));
}

export const useAIAssistantStore = create<AIAssistantState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  isOpen: false,
  suggestions: [
    'What crops should I focus on this season?',
    'How can I grow my vault faster?',
    'What milestones should I aim for?',
  ],

  sendMessage: async (message: string, context?: FarmContext) => {
    const userEntry: ChatEntry = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, userEntry],
      isLoading: true,
      error: null,
    }));

    try {
      const history = buildHistory(get().messages);
      const response = await sendChatMessage({ message, context, history });

      const assistantEntry: ChatEntry = {
        id: generateId(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        suggestions: response.suggestions,
      };

      set((state) => ({
        messages: [...state.messages, assistantEntry],
        isLoading: false,
        suggestions: response.suggestions || state.suggestions,
      }));
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Failed to get response. Please try again.';
      set({ error: errorMsg, isLoading: false });
    }
  },

  useSuggestion: async (suggestion: string, context?: FarmContext) => {
    await get().sendMessage(suggestion, context);
  },

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  clearChat: () =>
    set({
      messages: [],
      error: null,
      suggestions: [
        'What crops should I focus on this season?',
        'How can I grow my vault faster?',
        'What milestones should I aim for?',
      ],
    }),
  clearError: () => set({ error: null }),
}));
