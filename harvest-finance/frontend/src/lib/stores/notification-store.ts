import { create } from 'zustand';

export interface ToastNotification {
  id: string;
  type: 'vault_milestone' | 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  nextTarget?: string | null;
  tip?: string;
  duration?: number;
  createdAt: number;
}

interface NotificationState {
  toasts: ToastNotification[];
  push: (toast: Omit<ToastNotification, 'id' | 'createdAt'>) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

let counter = 0;

export const useToastStore = create<NotificationState>((set) => ({
  toasts: [],

  push: (toast) => {
    const id = `toast-${Date.now()}-${++counter}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, createdAt: Date.now() }],
    }));
  },

  dismiss: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));
