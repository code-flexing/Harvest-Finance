'use client';

import React from 'react';
import { Modal, ModalHeader, ModalBody, Button, Stack, Alert, cn } from '@/components/ui';
import { useWalletStore } from '@/store/wallet';
import { 
  Loader2, 
  AlertCircle, 
  Wallet, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Signal,
  HelpCircle
} from 'lucide-react';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletConnectModal: React.FC<WalletConnectModalProps> = ({ isOpen, onClose }) => {
  const { isConnecting, error, connect, isConnected } = useWalletStore();

  const handleConnect = async () => {
    await connect();
  };

  // Premium Helper: Map error to actionable advice
  const getActionableAdvice = (err: string) => {
    if (err.toLowerCase().includes('freighter')) return 'Ensure the Freighter extension is installed and unlocked.';
    if (err.toLowerCase().includes('cancelled')) return 'The connection request was dismissed. Try again when ready.';
    if (err.toLowerCase().includes('account')) return 'Your Stellar account may not be active. Send 2 XLM to activate it.';
    return 'Check your internet connection and try again.';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" className="backdrop-blur-3xl">
      <ModalHeader title="Secure Connection" onClose={onClose} className="border-b-0 pb-0" />
      <ModalBody>
        <Stack gap="xl" className="py-6">
          {/* Network Health Indicator - Premium Detail */}
          <div className="flex items-center justify-between px-4 py-2 bg-emerald-500/5 rounded-full border border-emerald-500/10 mb-2 animate-in fade-in duration-700">
             <div className="flex items-center gap-2">
               <Signal className="w-3 h-3 text-emerald-500" />
               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/80">Stellar Public Network</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Operational</span>
             </div>
          </div>

          {!isConnected && !isConnecting && (
            <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-harvest-green-500/20 rounded-[2rem] blur-3xl animate-pulse" />
                <div className="relative glass-panel glass-rim rounded-[2rem] w-full h-full flex items-center justify-center shadow-inner group">
                  <Wallet className="w-12 h-12 text-harvest-green-600 transition-transform group-hover:scale-110 duration-500" />
                  <div className="absolute -top-1 -right-1 bg-emerald-500 p-1.5 rounded-xl shadow-lg border-2 border-white dark:border-gray-900">
                    <ShieldCheck className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Gateway to Harvest</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 px-6 leading-relaxed font-medium">
                  Connect your institutional-grade wallet to begin capital deployment on Stellar.
                </p>
              </div>
            </div>
          )}

          {isConnecting && (
            <div className="flex flex-col items-center justify-center py-10 space-y-8 animate-in fade-in duration-300">
              <div className="relative">
                <div className="w-28 h-28 border-4 border-harvest-green-100 dark:border-harvest-green-900/30 rounded-full" />
                <Loader2 className="absolute top-0 left-0 w-28 h-28 text-harvest-green-600 animate-spin stroke-[1.5px]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 bg-harvest-green-600 rounded-full animate-pulse shadow-[0_0_25px_rgba(22,163,74,0.6)]" />
                </div>
              </div>
              <div className="text-center space-y-4 px-4">
                <p className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Authenticating Identity</p>
                <div className="glass-panel glass-rim bg-amber-500/5 border-amber-500/20 rounded-2xl p-4 flex gap-3 items-start text-left">
                  <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-black uppercase tracking-widest mb-1">Action Required</p>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 font-medium leading-relaxed">
                      Please sign the connection request in your Freighter popup to securely link your portfolio.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isConnected && (
            <div className="flex flex-col items-center justify-center py-10 space-y-8 animate-in slide-in-from-bottom-8 duration-700">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-3xl animate-pulse" />
                <div className="relative w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center border-2 border-emerald-500/20 shadow-2xl">
                  <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Connection Verified</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Your assets are now synced with Harvest protocols.</p>
              </div>
              <Button 
                variant="primary" 
                fullWidth 
                size="lg" 
                onClick={onClose} 
                className="rounded-2xl py-8 text-xl font-black shadow-2xl shadow-harvest-green-500/40 animate-shimmer"
              >
                Launch Dashboard
              </Button>
            </div>
          )}

          {error && !isConnecting && (
            <div className="animate-in shake-1 duration-300">
              <div className="glass-panel border-red-500/20 bg-red-500/5 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <h4 className="font-black text-red-500 uppercase tracking-widest text-sm">Connection Blocked</h4>
                </div>
                <p className="text-sm text-red-900/70 dark:text-red-400/70 font-medium leading-relaxed">
                  {error}
                </p>
                <div className="pt-2 border-t border-red-500/10">
                   <p className="text-[10px] font-black text-red-500/60 uppercase tracking-widest">Recommended Fix</p>
                   <p className="text-xs text-red-900/80 dark:text-red-400/80 font-bold mt-1">
                     {getActionableAdvice(error)}
                   </p>
                </div>
              </div>
            </div>
          )}

          {!isConnected && !isConnecting && (
            <Stack gap="md">
              <button
                onClick={handleConnect}
                className="group relative glass-panel glass-rim flex items-center justify-between w-full p-6 rounded-[2rem] border-gray-100 dark:border-gray-800 hover:border-harvest-green-500/30 hover:bg-harvest-green-500/5 transition-all duration-500 hover:shadow-2xl hover:shadow-harvest-green-500/10 active:scale-[0.98]"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl flex items-center justify-center shadow-xl transition-all group-hover:scale-110 group-hover:rotate-3 duration-500">
                    <img src="https://www.freighter.app/static/media/freighter-logo.8e6b2c6e.svg" alt="Freighter" className="w-8 h-8" />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-gray-900 dark:text-white text-xl tracking-tighter">Freighter Wallet</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-harvest-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest">Stellar Mainnet Active</p>
                    </div>
                  </div>
                </div>
                <div className="bg-harvest-green-100 dark:bg-harvest-green-900/40 p-2.5 rounded-xl opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-500">
                  <ArrowRight className="w-5 h-5 text-harvest-green-600" />
                </div>
              </button>

              <div className="pt-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                   <ShieldCheck className="w-3 h-3 text-gray-400" />
                   <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-[0.2em]">
                     Encrypted via Soroban Smart Contracts
                   </p>
                </div>
              </div>
            </Stack>
          )}
        </Stack>
      </ModalBody>
    </Modal>
  );
};
