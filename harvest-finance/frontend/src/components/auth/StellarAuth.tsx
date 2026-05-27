'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as StellarSdk from 'stellar-sdk';
import { useAuthStore } from '@/lib/stores/auth-store';
import { stellarAuthSchema, type StellarAuthFormData } from '@/lib/validations/auth';

type WalletProvider = 'freighter' | 'metamask' | 'albedo';

interface WalletInfo {
  name: string;
  icon: string;
  description: string;
  installUrl: string;
}

interface StellarAuthProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function StellarAuth({ onSuccess, onError }: StellarAuthProps) {
  const { stellarLogin, isLoading, error, clearError } = useAuthStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [userPublicKey, setUserPublicKey] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<WalletProvider | null>(null);
  const [showWalletOptions, setShowWalletOptions] = useState(true);

  const wallets: Record<WalletProvider, WalletInfo> = {
    freighter: {
      name: 'Freighter',
      icon: '🚀',
      description: 'Popular Stellar wallet with browser extension',
      installUrl: 'https://www.freighter.app/'
    },
    metamask: {
      name: 'MetaMask',
      icon: '🦊',
      description: 'Multi-chain wallet with Stellar support',
      installUrl: 'https://metamask.io/'
    },
    albedo: {
      name: 'Albedo',
      icon: '🌟',
      description: 'Web-based Stellar wallet',
      installUrl: 'https://albedo.link/'
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<StellarAuthFormData>({
    resolver: zodResolver(stellarAuthSchema),
  });

  const connectWallet = async (walletType: WalletProvider) => {
    setIsConnecting(true);
    clearError();
    setSelectedWallet(walletType);

    try {
      let publicKey: string;

      switch (walletType) {
        case 'freighter':
          if (!window.freighter) {
            throw new Error('Freighter wallet is not installed. Please install Freighter to continue.');
          }
          publicKey = await window.freighter.getPublicKey();
          break;

        case 'metamask':
          if (!window.ethereum) {
            throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
          }
          // Check if MetaMask has Stellar support
          if (!window.ethereum.isStellarSupported) {
            throw new Error('MetaMask Stellar support is not enabled. Please enable Stellar in MetaMask settings.');
          }
          // Request Stellar account access
          const accounts = await window.ethereum.request({
            method: 'stellar_requestAccounts'
          });
          publicKey = accounts[0];
          break;

        case 'albedo':
          // Albedo is web-based, we'll use popup authentication
          publicKey = await new Promise((resolve, reject) => {
            const popup = window.open('https://albedo.link/?action=sign', 'albedo', 'width=400,height=600');
            
            const messageHandler = (event: MessageEvent) => {
              if (event.origin === 'https://albedo.link') {
                if (event.data.publicKey) {
                  resolve(event.data.publicKey);
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
              reject(new Error('Albedo connection timed out'));
            }, 300000);
          });
          break;

        default:
          throw new Error('Unsupported wallet type');
      }
      
      if (!publicKey) {
        throw new Error(`Failed to connect to ${wallets[walletType].name} wallet`);
      }

      setUserPublicKey(publicKey);
      setValue('public_key', publicKey);
      setWalletConnected(true);
      setShowWalletOptions(false);
    } catch (err: any) {
      const errorMessage = err.message || `Failed to connect to ${wallets[walletType].name} wallet`;
      onError?.(errorMessage);
      setSelectedWallet(null);
    } finally {
      setIsConnecting(false);
    }
  };

  const onSubmit = async (data: StellarAuthFormData) => {
    try {
      await stellarLogin(data.public_key, selectedWallet || 'freighter');
      onSuccess?.();
    } catch (err: any) {
      // Error is handled in the store
    }
  };

  const disconnectWallet = () => {
    setUserPublicKey(null);
    setValue('public_key', '');
    setWalletConnected(false);
    setSelectedWallet(null);
    setShowWalletOptions(true);
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="status-banner status-banner--error" role="alert" aria-live="polite">
          <p>{error}</p>
        </div>
      ) : null}

      {!walletConnected ? (
        <div className="text-center">
          <div className="mb-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
              <svg
                className="h-8 w-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Connect with Stellar
            </h3>
            <p className="text-sm text-slate-600 dark:text-gray-400 mb-6">
              Sign in securely using your Stellar wallet
            </p>
          </div>

          {showWalletOptions && (
            <div className="space-y-3">
              {Object.entries(wallets).map(([key, wallet]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => connectWallet(key as WalletProvider)}
                  disabled={isConnecting}
                  aria-busy={isConnecting && selectedWallet === key}
                  className="btn-primary w-full flex items-center justify-center gap-3"
                >
                  {isConnecting && selectedWallet === key ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Connecting to {wallet.name}...
                    </>
                  ) : (
                    <>
                      <span className="text-xl">{wallet.icon}</span>
                      Connect {wallet.name}
                    </>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 text-xs text-slate-500 dark:text-gray-500">
            <p>Don't have a Stellar wallet?</p>
            <div className="flex gap-2 justify-center mt-2">
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Freighter
              </a>
              <span>•</span>
              <a
                href="https://metamask.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                MetaMask
              </a>
              <span>•</span>
              <a
                href="https://albedo.link/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Albedo
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Wallet Connected
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-mono">
                  {userPublicKey}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="public_key" className="field-label">
                Stellar Public Key
              </label>
              <input
                {...register('public_key')}
                type="text"
                id="public_key"
                readOnly
                className="input-field bg-slate-50 dark:bg-slate-800"
                placeholder="G..."
              />
              {errors.public_key ? (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {errors.public_key.message}
                </p>
              ) : null}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
                className="btn-primary flex-1"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign in with Stellar'
                )}
              </button>

              <button
                type="button"
                onClick={disconnectWallet}
                disabled={isLoading}
                className="btn-secondary"
              >
                Disconnect
              </button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> You'll be asked to sign a message in your wallet to verify your identity. 
              This does not cost any transaction fees.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Type declarations for wallet APIs
declare global {
  interface Window {
    freighter?: {
      getPublicKey: () => Promise<string>;
      signTransaction: (xdr: string) => Promise<string>;
      isConnected: () => Promise<boolean>;
    };
    ethereum?: {
      isStellarSupported?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}
