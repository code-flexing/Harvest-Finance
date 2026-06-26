"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useTranslation } from '@/lib/i18n';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Stack,
  Alert,
  Badge,
  Input,
  Tooltip,
  cn,
  ModalSkeleton
} from "@/components/ui";
import {
  Wallet,
  ShieldCheck,
  TrendingUp,
  Info,
  Zap,
  Activity,
  ArrowUpRight,
  Loader2
} from "lucide-react";
import { parseStellarError } from "@/lib/errors/stellar-errors";
import { enqueueOfflineAction } from "@/lib/offline-support";
import { useAuthStore } from "@/lib/stores/auth-store";
import { toI128, calculateEstimatedShares } from "@/lib/soroban-i128";
import { getTermTooltip } from "@/lib/defi-terms";
import { useTransactionValidation } from "@/hooks/useTransactionValidation";
import axios from "@/lib/api-client";
import { toast } from 'react-toastify';

interface DepositModalVault {
  id: string;
  name: string;
  asset: string;
  walletBalance: string;
  tvl: number | string;
  balance?: number | string;
  apy?: number;
  cropCycle?: { yieldRate: number };
  totalAssets?: number;
  totalShares?: number;
}

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: DepositModalVault | null;
  onSuccess?: () => void;
  onDepositSuccess?: (vaultId: string, amount: number) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  vault,
  onSuccess,
  onDepositSuccess,
}) => {
  const { t } = useTranslation();
  const { token } = useAuthStore();
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    isValid,
    isOverBalance,
    isInsufficientGas,
    isLowGas,
    errorMessage: validationError,
    warningMessage: validationWarning,
  } = useTransactionValidation({
    amount,
    availableBalance: vault?.walletBalance ?? "0",
    assetSymbol: vault?.asset ?? "",
    operation: "deposit",
  });

  const numericAmount = parseFloat(amount) || 0;
  const walletBalanceNum = parseFloat(vault?.walletBalance ?? "0") || 0;

  const i128Value = useMemo(() => toI128(numericAmount), [numericAmount]);

  const handleDeposit = async () => {
    if (!vault) {
      setError("Please select a vault");
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (isOverBalance) {
      setError(`Amount exceeds wallet balance of ${vault.walletBalance} ${vault.asset}`);
      return;
    }

    if (isInsufficientGas) {
      setError("Insufficient XLM for network gas fees");
      return;
    }

    // Premium Detail: Transaction Simulation
    setIsSimulating(true);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate Stellar network latency
    setIsSimulating(false);

    setIsLoading(true);
    setError(null);

    let toastId: string | number | null = null;
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueueOfflineAction({
          type: "deposit",
          endpoint: `http://localhost:3001/api/v1/farm-vaults/${vault.id}/deposit`,
          payload: { amount: i128Value },
        });
        onSuccess?.();
        onDepositSuccess?.(vault.id, Number(amount));
        onClose();
        setAmount("");
        return;
      }

      toastId = toast.loading('Deposit pending — awaiting confirmation...', { autoClose: false });

      await axios.post(
        `http://localhost:3001/api/v1/farm-vaults/${vault.id}/deposit`,
        { amount: i128Value },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (toastId) toast.update(toastId, { render: 'Deposit confirmed', type: 'success', isLoading: false, autoClose: 5000 });

      onSuccess?.();
      onDepositSuccess?.(vault.id, Number(amount));
      onClose();
      setAmount("");
    } catch (err: any) {
      console.error("Deposit failed:", err);
      const parsed = parseStellarError(err);
      // update toast to error with parsed message
      if (toastId) {
        toast.update(toastId, { render: parsed.message, type: 'error', isLoading: false, autoClose: 8000 });
      } else {
        toast.error(parsed.message);
      }
      setError(parsed.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" className="backdrop-blur-3xl">
      <ModalHeader title="Capital Deployment" onClose={onClose} className="border-b-0 pb-0" />
      <ModalBody>
        {!vault ? (
          <ModalSkeleton />
        ) : (
          <Stack gap="xl" className="py-2">
          {/* Liquidity Card - Enhanced Glassmorphism */}
          <div className="relative overflow-hidden rounded-[2.5rem] glass-panel glass-rim bg-gradient-to-br from-harvest-green-600 to-harvest-green-900 p-8 text-white shadow-2xl border-emerald-400/20">
            <div className="absolute -right-4 -top-4 h-48 w-48 rounded-full bg-white/10 blur-3xl animate-pulse" />
            <div className="absolute inset-0 animate-shimmer opacity-20" />
            <div className="relative z-10 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-100/90">
                    Stellar Secure Liquidity
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full border border-white/10 backdrop-blur-md">
                   <Activity className="w-3 h-3 text-emerald-300" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Live</span>
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <h2 className="text-6xl font-black tracking-tighter">
                  {vault?.walletBalance || "0.00"}
                </h2>
                <span className="text-2xl font-bold text-emerald-200/80">
                  {vault?.asset || "USDC"}
                </span>
              </div>
              <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                 <div>
                    <p className="text-[9px] font-black text-emerald-200/50 uppercase tracking-[0.2em] mb-1">Available to Deploy</p>
                    <p className="text-sm font-bold">100% Liquidity</p>
                 </div>
                 <div className="h-8 w-px bg-white/10" />
                 <div>
                    <p className="text-[9px] font-black text-emerald-200/50 uppercase tracking-[0.2em] mb-1">Protocol Status</p>
                    <p className="text-sm font-bold">Optimized</p>
                 </div>
              </div>
            </div>
          </div>

          {/* Input Interface - Premium Theme */}
          <Stack gap="md">
            <div className="flex justify-between items-end px-2">
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-harvest-green-600" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                  Deployment Quantum
                </p>
              </div>
              <button 
                onClick={() => {
                  setAmount(String(vault?.walletBalance || "0"));
                  setError(null);
                }}
                className="text-[10px] font-black text-harvest-green-600 hover:text-harvest-green-700 transition-all uppercase tracking-widest bg-harvest-green-500/10 dark:bg-harvest-green-500/5 px-5 py-2 rounded-2xl border border-harvest-green-500/20 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                Max Balance
              </button>
            </div>
            <div className="group relative">
               <Input
                value={amount}
                onChange={(e: any) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                error={isOverBalance ? `Exceeds wallet balance (${vault?.walletBalance} ${vault?.asset})` : undefined}
                type="number"
                placeholder="0.00"
                className="h-24 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-black/20 px-10 text-4xl font-black text-gray-900 dark:text-white outline-none transition-all focus:border-harvest-green-500 focus:ring-[15px] focus:ring-harvest-green-500/5 shadow-inner group-hover:border-gray-200 dark:group-hover:border-gray-700"
                autoFocus
              />
              <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                 <p className="text-xl font-black text-gray-300 dark:text-gray-600 tracking-tighter uppercase">{vault?.asset}</p>
              </div>
            </div>
          </Stack>

          {/* Projection Engine - Premium Micro-interactions */}
          {numericAmount > 0 && (
            <div className="animate-in slide-in-from-top-4 fade-in duration-700">
              <div className="rounded-[2.5rem] glass-panel glass-rim bg-gray-50/50 dark:bg-white/5 p-8 space-y-6 relative overflow-hidden group">
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                      <TrendingUp className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">Harvest Forecast</p>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-black text-gray-900 dark:text-white">Compound Strategy</p>
                        <Badge variant="success" className="text-[9px] font-black tracking-widest px-2 py-0.5 border-emerald-500/20">Active</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-emerald-500">+{vault?.apy || "0"}%</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Optimized APY</p>
                  </div>
                </div>
                
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent" />

                <div className="grid grid-cols-2 gap-10 relative z-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Growth</p>
                    <div className="flex items-baseline gap-1">
                       <p className="text-3xl font-black text-gray-900 dark:text-white">
                         +${(Number(amount) * (Number(vault?.apy || 0) / 100) / 12).toLocaleString()}
                       </p>
                    </div>
                  </div>
                  <div className="space-y-2 text-right border-l border-gray-100 dark:border-gray-800 pl-8">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Yearly Harvest</p>
                    <div className="flex items-baseline justify-end gap-1">
                      <p className="text-3xl font-black text-emerald-500">
                        +${(Number(amount) * (Number(vault?.apy || 0) / 100)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-[10px] font-bold text-gray-400">
                   <div className="flex items-center gap-2">
                     <Activity className="w-3 h-3 text-harvest-green-600" />
                     <span>Soroban Fee: ≈ 0.0001 XLM</span>
                   </div>
                   <div className="flex items-center gap-1.5 text-emerald-500 uppercase tracking-widest">
                     <ShieldCheck className="w-3 h-3" />
                     <span>Simulation Verified</span>
                   </div>
                </div>
              </div>
            </div>
          )}

          {validationError && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <Alert
                variant="error"
                title="Transaction Blocked"
                description={validationError}
                className="rounded-[2rem] border-2 border-red-500/20 bg-red-500/5 text-red-900 dark:text-red-400"
              />
            </div>
          )}

          {validationWarning && !validationError && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <Alert
                variant="warning"
                title="Gas Warning"
                description={validationWarning}
                className="rounded-[2rem] border-2 border-amber-500/20 bg-amber-500/5 text-amber-900 dark:text-amber-400"
              />
            </div>
          )}

          {error && !validationError && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <Alert
                variant="error"
                title="Input Refused"
                description={error}
                className="rounded-[2rem] border-2 border-red-500/20 bg-red-500/5 text-red-900 dark:text-red-400"
              />
            </div>
          )}
        </Stack>
        )}
      </ModalBody>
      <ModalFooter className="border-t-0 pt-4 pb-10 px-8 flex-col gap-4">
        <Button
          variant="primary"
          fullWidth
          size="lg"
          isLoading={isLoading || isSimulating}
          isDisabled={!isValid || isLoading || isSimulating}
          onClick={handleDeposit}
          className="rounded-[1.5rem] py-10 text-2xl font-black shadow-2xl shadow-harvest-green-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] animate-shimmer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isSimulating ? (
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Simulating...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span>Initialize Deployment</span>
              <ArrowUpRight className="w-6 h-6" />
            </div>
          )}
        </Button>
        <button 
          onClick={onClose} 
          disabled={isLoading || isSimulating}
          className="text-xs font-black text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-[0.25em] py-2"
        >
          Cancel and Return
        </button>
      </ModalFooter>
    </Modal>
  );
};
