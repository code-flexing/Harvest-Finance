'use client';

import axios from 'axios';
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
  stellarLogin: (publicKey: string, walletType?: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  clearError: () => void;
  hydrate: () => void;
}

type AuthStore = AuthState & AuthActions;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

function normalizeRole(role: string): UserRole {
  return role.toLowerCase() as UserRole;
}

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

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      const { access_token, user } = response.data;
      const normalizedUser = { ...user, role: normalizeRole(user.role) };
      saveToStorage(access_token, normalizedUser);
      set({ user: normalizedUser, token: access_token, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.message || 'Login failed. Check your credentials.',
      });
    }
  },

  signup: async (name, email, password, role) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        full_name: name,
        email,
        password,
        role: role.toUpperCase(),
      });

      const { access_token, user } = response.data;
      const normalizedUser = { ...user, role: normalizeRole(user.role) };
      saveToStorage(access_token, normalizedUser);
      set({ user: normalizedUser, token: access_token, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.message || 'Signup failed. Please try again.',
      });
    }
  },

  logout: async () => {
    try {
      const { token } = loadFromStorage();
      if (token) {
        await axios.post(
          `${API_BASE_URL}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
    } catch {
      // ignore logout failures
    } finally {
      clearStorage();
      set({ user: null, token: null, isAuthenticated: false, error: null });
    }
  },

  stellarLogin: async (publicKey, walletType = 'freighter') => {
    set({ isLoading: true, error: null });
    try {
      // Step 1: Request challenge
      const challengeResponse = await axios.post(`${API_BASE_URL}/auth/stellar/challenge`, {
        public_key: publicKey,
      });

      const { transaction, network_passphrase } = challengeResponse.data;

      // Step 2: Sign the transaction with the appropriate wallet
      let signedTransaction: string;

      switch (walletType) {
        case 'freighter':
          if (!window.freighter) {
            throw new Error('Freighter wallet is not installed');
          }
          signedTransaction = await window.freighter.signTransaction(transaction);
          break;

        case 'metamask':
          if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
          }
          if (!window.ethereum.isStellarSupported) {
            throw new Error('MetaMask Stellar support is not enabled');
          }
          signedTransaction = await window.ethereum.request({
            method: 'stellar_signTransaction',
            params: { transaction, network_passphrase }
          });
          break;

        case 'albedo':
          signedTransaction = await new Promise((resolve, reject) => {
            const popup = window.open(
              `https://albedo.link/?action=sign&xdr=${encodeURIComponent(transaction)}`,
              'albedo-sign',
              'width=400,height=600'
            );
            
            const messageHandler = (event: MessageEvent) => {
              if (event.origin === 'https://albedo.link') {
                if (event.data.signed_transaction_xdr) {
                  resolve(event.data.signed_transaction_xdr);
                } else if (event.data.error) {
                  reject(new Error(event.data.error));
                }
                popup?.close();
                window.removeEventListener('message', messageHandler);
              }
            };
            
            window.addEventListener('message', messageHandler);
            
            // Timeout after 5 minutes
            setTimeout(() => {
              popup?.close();
              window.removeEventListener('message', messageHandler);
              reject(new Error('Albedo signing timed out'));
            }, 300000);
          });
          break;

        default:
          throw new Error('Unsupported wallet type');
      }

      // Step 3: Verify the signed transaction and get tokens
      const verifyResponse = await axios.post(`${API_BASE_URL}/auth/stellar/verify`, {
        transaction: signedTransaction,
      });

      const { access_token, user } = verifyResponse.data;
      const normalizedUser = { 
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: normalizeRole(user.role) 
      } as User;
      
      saveToStorage(access_token, normalizedUser);
      set({ user: normalizedUser, token: access_token, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.message || err.message || 'Stellar authentication failed',
      });
    }
  },

  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      set({ isLoading: false });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.message || 'Request failed. Please try again.',
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
