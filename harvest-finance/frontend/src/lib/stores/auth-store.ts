'use client';

import { create } from 'zustand';
import type { UserRole } from '@/lib/validations/auth';

// ─── Types ───────────────────────────────────────────────────
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  clearError: () => void;
  hydrate: () => void;
}

type AuthStore = AuthState & AuthActions;

// ─── Helpers ─────────────────────────────────────────────────
const TOKEN_KEY = 'harvest_auth_token';
const USER_KEY = 'harvest_auth_user';

function saveToStorage(token: string, user: User) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function loadFromStorage(): { token: string | null; user: User | null } {
  if (typeof window === 'undefined') return { token: null, user: null };
  const token = localStorage.getItem(TOKEN_KEY);
  const userStr = localStorage.getItem(USER_KEY);
  const user = userStr ? JSON.parse(userStr) : null;
  return { token, user };
}

// ─── Mock delay to simulate API ──────────────────────────────
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// ─── Store ───────────────────────────────────────────────────
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      await delay(1500); // simulate API call

      // Mock validation
      if (password.length < 8) {
        throw new Error('Invalid credentials. Please try again.');
      }

      const mockToken = `jwt_${btoa(email)}_${Date.now()}`;
      const mockUser: User = {
        id: crypto.randomUUID(),
        name: email.split('@')[0],
        email,
        role: 'farmer',
      };

      saveToStorage(mockToken, mockUser);
      set({ user: mockUser, token: mockToken, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Login failed',
      });
    }
  },

  signup: async (name, email, password, role) => {
    set({ isLoading: true, error: null });
    try {
      await delay(1500);

      const mockToken = `jwt_${btoa(email)}_${Date.now()}`;
      const mockUser: User = { id: crypto.randomUUID(), name, email, role };

      saveToStorage(mockToken, mockUser);
      set({ user: mockUser, token: mockToken, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Signup failed',
      });
    }
  },

  logout: () => {
    clearStorage();
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await delay(1500);
      set({ isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Request failed',
      });
    }
  },

  clearError: () => set({ error: null }),

  hydrate: () => {
    const { token, user } = loadFromStorage();
    if (token && user) {
      set({ token, user, isAuthenticated: true });
    }
  },
}));
