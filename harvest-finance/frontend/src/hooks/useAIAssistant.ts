'use client';

import { create } from 'zustand';
import {
  sendChatMessage,
  ChatMessage as ApiChatMessage,
  FarmContext,
  ChatResponse,
} from '@/lib/api/ai-assistant-client';
import type { ChatEntry } from '@/types/ai-chat';
import {
  saveAiSession,
  loadAiSession,
  loadAiInsights,
  enqueueSyncItem,
} from '@/lib/offline/db';

export type { ChatEntry };

interface AIAssistantState {
  messages: ChatEntry[];
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  suggestions: string[];

  sendMessage: (message: string, context?: FarmContext) => Promise<void>;
  useSuggestion: (suggestion: string, context?: FarmContext) => Promise<void>;
  loadHistoryFromServer?: () => Promise<void>;
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

    const offline =
      typeof navigator !== 'undefined' && !navigator.onLine;

    if (offline) {
      await enqueueSyncItem('chat', { message, context });
      const insights = await loadAiInsights();
      const assistantEntry: ChatEntry = {
        id: generateId(),
        role: 'assistant',
        content: insights
          ? `Sin conexión. Último consejo guardado: ${insights.summary}`
          : 'Sin conexión. Tu mensaje quedó en cola y se enviará al recuperar la conexión.',
        timestamp: new Date(),
        suggestions: insights?.suggestions?.length
          ? insights.suggestions
          : get().suggestions,
      };
      set((state) => ({
        messages: [...state.messages, assistantEntry],
        isLoading: false,
        suggestions: assistantEntry.suggestions || state.suggestions,
      }));
      await saveAiSession(get().messages, get().suggestions);
      return;
    }

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
      await saveAiSession(get().messages, get().suggestions);
    } catch (err) {
      const cached = await loadAiSession();
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Failed to get response. Please try again.';
      if (cached?.messages?.length) {
        set({
          error: null,
          isLoading: false,
          messages: cached.messages,
          suggestions: cached.suggestions,
        });
      } else {
        set({ error: errorMsg, isLoading: false });
      }
    }
  },

  useSuggestion: async (suggestion: string, context?: FarmContext) => {
    await get().sendMessage(suggestion, context);
  },

  // Load persisted history from server-side store if available
  loadHistoryFromServer: async () => {
    try {
      const res = await fetch('/api/v1/ai-assistant/chat');
      if (!res.ok) return;
      const body = await res.json();
      const history = body.history || [];

      const mapped: ChatEntry[] = [];
      for (const item of history) {
        if (item.user) {
          mapped.push({
            id: generateId(),
            role: 'user',
            content: item.user.content,
            timestamp: item.user.timestamp ? new Date(item.user.timestamp) : new Date(),
          });
        }
        if (item.assistant) {
          mapped.push({
            id: generateId(),
            role: 'assistant',
            content: item.assistant.content,
            timestamp: item.assistant.timestamp ? new Date(item.assistant.timestamp) : new Date(),
            suggestions: item.assistant.suggestions || undefined,
          });
        }
      }

      if (mapped.length > 0) {
        set((state) => ({ messages: [...state.messages, ...mapped] }));
      }
    } catch (e) {
      // ignore
    }
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

// Persist chat to sessionStorage and IndexedDB
try {
  const key = 'ai-assistant-state-v1';
  const stored = sessionStorage.getItem(key);
  if (stored) {
    const parsed = JSON.parse(stored);
    useAIAssistantStore.setState({
      messages: (parsed.messages || []).map((m: any) => ({
        ...m,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      })),
      isOpen: parsed.isOpen || false,
      suggestions: parsed.suggestions || undefined,
    });
  }
  void loadAiSession().then((fromDb) => {
    if (!fromDb?.messages?.length) return;
    if (useAIAssistantStore.getState().messages.length > 0) return;
    useAIAssistantStore.setState({
      messages: fromDb.messages.map((m) => ({
        ...m,
        timestamp:
          m.timestamp instanceof Date
            ? m.timestamp
            : new Date(m.timestamp as unknown as string),
      })),
      suggestions: fromDb.suggestions,
    });
  });

  useAIAssistantStore.subscribe((state) => {
    const toStore = {
      messages: state.messages.map((m) => ({
        ...m,
        timestamp: m.timestamp?.toISOString(),
      })),
      isOpen: state.isOpen,
      suggestions: state.suggestions,
    };
    try {
      sessionStorage.setItem(key, JSON.stringify(toStore));
    } catch {
      // ignore
    }
    void saveAiSession(state.messages, state.suggestions);
  });
} catch {
  // server-side or storage not available
}
