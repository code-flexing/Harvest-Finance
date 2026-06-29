'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ShieldAlert, Key, Copy, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import axios from 'axios';

interface ExportKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportKeyModal: React.FC<ExportKeyModalProps> = ({ isOpen, onClose }) => {
  const { token, user } = useAuthStore();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !user || user.wallet_type !== 'custodial') {
    return null;
  }

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/wallets/custodial/export-key`,
        { password },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSecretKey(response.data.secret_key);
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Too many attempts. Please try again later.');
      } else if (err.response?.status === 401) {
        setError('Invalid password. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (secretKey) {
      await navigator.clipboard.writeText(secretKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setPassword('');
    setSecretKey(null);
    setShowKey(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
            <ShieldAlert className="w-6 h-6" />
            <h2 className="text-lg font-bold">Export Private Key</h2>
          </div>

          {!secretKey ? (
            <form onSubmit={handleExport}>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Your private key allows full control over your funds. To view and export it, please enter your current account password.
              </p>

              <div className="mb-6">
                <label htmlFor="export-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  id="export-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-slate-900 dark:text-white"
                  placeholder="Enter your password"
                  required
                />
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!password || isLoading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  Export Key
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-bold text-red-800 dark:text-red-300 mb-1">
                  Keep this key secret!
                </h3>
                <p className="text-xs text-red-700 dark:text-red-400">
                  Anyone with this key has full access to your funds. Never share it with anyone, including Harvest Finance staff.
                </p>
              </div>

              <div className="mb-6 relative">
                <div className="flex justify-between items-end mb-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Stellar Secret Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-xs text-[var(--brand)] hover:text-[var(--brand-strong)] flex items-center gap-1"
                  >
                    {showKey ? (
                      <><EyeOff className="w-3 h-3" /> Hide</>
                    ) : (
                      <><Eye className="w-3 h-3" /> Show</>
                    )}
                  </button>
                </div>
                <div className="relative flex items-center">
                  <code
                    className={`block w-full px-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-mono break-all pr-12 transition-all duration-300 ${
                      !showKey ? 'blur-sm select-none text-slate-400' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {secretKey}
                  </code>
                  <button
                    onClick={copyToClipboard}
                    className="absolute right-2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 rounded-lg shadow-sm transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
