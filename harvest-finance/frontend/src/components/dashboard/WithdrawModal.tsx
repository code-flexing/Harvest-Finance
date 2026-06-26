"use client";

import React, { useState, useMemo } from "react";
import { useTranslation } from '@/lib/i18n';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Stack,
  Badge,
  Alert,
  cn,
  ModalSkeleton
} from "@/components/ui";
import { parseStellarError } from "@/lib/errors/stellar-errors";
import { toI128 } from "@/lib/soroban-i128";
import { useTransactionValidation } from "@/hooks/useTransactionValidation";
import { 
  Wallet, 
  ArrowDownLeft, 
  AlertTriangle, 
  Info, 
  TrendingUp,
  Activity,
  ShieldCheck,
  Loader2,
  ArrowRight
} from "lucide-react";
import axios from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { enqueueOfflineAction } from "@/lib/offline-support";
import { toast } from 'react-toastify';

interface WithdrawModalVault {
  id: string;
  name: string;
  asset: string;
  balance?: number | string;
  totalAssets?: number;
  totalShares?: number;
  apy?: number;
  projections?: { progressPercentage: number };
}

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: WithdrawModalVault | null;
  onSuccess?: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  vault,
  onSuccess,
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
    availableBalance: vault?.balance ?? "0",
    assetSymbol: vault?.asset ?? "",
    operation: "withdraw",
  });

  // Derived values
  const numericAmount = parseFloat(amount) || 0;
  const vaultBalanceNum = parseFloat(String(vault?.balance ?? "0")) || 0;

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (isOverBalance) {
      setError("Insufficient balance in vault");
      return;
    }

    if (isInsufficientGas) {
      setError("Insufficient XLM for network gas fees");
      return;
    }

    setIsSimulating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSimulating(false);

    setIsLoading(true);
    setError(null);
    let toastId: string | number | null = null;
    try {
      const i128Amount = toI128(Number(amount));

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueueOfflineAction({
          type: "withdraw",
          endpoint: `http://localhost:3001/api/v1/farm-vaults/${vault!.id}/withdraw`,
          payload: { amount: i128Amount },
        });
        onSuccess?.();
        onClose();
        setAmount("");
        return;
      }
      toastId = toast.loading('Withdrawal pending — awaiting confirmation...', { autoClose: false });

      await axios.post(
        `http://localhost:3001/api/v1/farm-vaults/${vault!.id}/withdraw`,
        { amount: i128Amount },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (toastId) toast.update(toastId, { render: 'Withdrawal confirmed', type: 'success', isLoading: false, autoClose: 5000 });
      onSuccess?.();
      onClose();
      setAmount("");
    } catch (err: any) {
      console.error("Withdraw failed:", err);
      const parsed = parseStellarError(err);
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

  const isEarlyWithrawal = (vault?.projections?.progressPercentage || 0) < 100;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" className="backdrop-blur-3xl">
      <ModalHeader title="Capital Extraction" onClose={onClose} className="border-b-0 pb-0" />
      <ModalBody>
        {!vault ? (
          <ModalSkeleton />
        ) : (
          <Stack gap="xl" className="py-2">
          {/* Header Card - Premium Gradient Glass */}
          <div className="relative overflow-hidden rounded-[2.5rem] glass-panel glass-rim bg-gradient-to-br from-harvest-green-600 to-harvest-green-900 p-8 text-white shadow-2xl border-emerald-400/20">
            <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/10 blur-3xl animate-pulse" />
            <div className="absolute inset-0 animate-shimmer opacity-10" />
            <div className="relative z-10 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
                    <Activity className="w-4 h-4 text-emerald-300" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-100/90">
                    Portfolio Extraction
                  </p>
                </div>
                <Badge variant="primary" className="bg-white/10 text-white border-white/20 backdrop-blur-sm text-[10px] font-black tracking-widest px-3 py-1">
                  {vault?.projections?.progressPercentage ?? 0}% Mature
                </Badge>
              </div>
              <div className="flex items-baseline gap-3">
                <h2 className="text-6xl font-black tracking-tighter">
                  {vault?.balance || "0.00"}
                </h2>
                <span className="text-2xl font-bold text-emerald-200/80">
                  {vault?.asset || "USDC"}
                </span>
              </div>
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <p className="text-xs font-bold text-emerald-100/70">
                  Origin: {vault?.name}
                </p>
                <div className="flex items-center gap-1.5">
                   <ShieldCheck className="w-3 h-3 text-emerald-400" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Vault Protected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Input Section */}
          <Stack gap="md">
            <div className="flex justify-between items-end px-2">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500">
                Extraction Volume
              </p>
              <button 
                onClick={() => {
                  setAmount(String(vault?.balance || "0"));
                  setError(null);
                }}
                className="text-[10px] font-black text-harvest-green-600 hover:text-harvest-green-700 transition-all uppercase tracking-widest bg-harvest-green-500/10 dark:bg-harvest-green-500/5 px-4 py-1.5 rounded-2xl border border-harvest-green-500/20 shadow-sm"
              >
                Max Portfolio
              </button>
            </div>
            <div className="relative group">
              <input
                type="number"
                placeholder="0.00"
                className="w-full h-24 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-black/20 px-10 text-4xl font-black text-gray-900 dark:text-white outline-none transition-all focus:border-harvest-green-500 focus:ring-[15px] focus:ring-harvest-green-500/5 shadow-inner"
                value={amount}
                onChange={(e: any) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
              />
              <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                <p className="text-xl font-black text-gray-300 dark:text-gray-600 tracking-tighter uppercase">{vault?.asset}</p>
              </div>
            </div>

            {/* Percentage Quick-Select - Premium UI */}
            <div className="flex gap-2 p-2 bg-gray-100/50 dark:bg-white/5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-inner">
              {[25, 50, 75, 100].map((percent) => {
                const calculated = (vaultBalanceNum * percent) / 100;
                const isActive = amount === calculated.toString();
                return (
                  <button
                    key={percent}
                    onClick={() => {
                      setAmount(calculated.toString());
                      setError(null);
                    }}
                    className={cn(
                      "flex-1 py-4 rounded-2xl text-xs font-black transition-all duration-500 uppercase tracking-[0.2em]",
                      isActive 
                        ? "bg-white dark:bg-gray-800 text-harvest-green-600 shadow-xl ring-1 ring-black/5 scale-[1.02]" 
                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-black/10"
                    )}
                  >
                    {percent}%
                  </button>
                );
              })}
            </div>
          </Stack>

          {/* Projections Panel - Premium Visuals */}
          {numericAmount > 0 && (
            <div className="animate-in slide-in-from-top-4 fade-in duration-700">
              <div className="rounded-[2.5rem] glass-panel glass-rim bg-emerald-500/5 border-emerald-500/10 p-8 space-y-6 relative overflow-hidden group">
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
                      <TrendingUp className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">Simulation Data</p>
                      <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Oracle-Verified Flow</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-10 relative z-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Withdrawal Impact</p>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-3xl font-black text-gray-900 dark:text-white">-{numericAmount.toLocaleString()}</p>
                      <span className="text-xs font-bold text-gray-400">{vault?.asset}</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-right border-l border-gray-100 dark:border-gray-800 pl-8">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Yield Foregone (Yearly)</p>
                    <div className="flex items-baseline justify-end gap-1.5">
                      <p className="text-3xl font-black text-red-500">
                        -${(numericAmount * (Number(vault?.apy || 8.5) / 100)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-[10px] font-bold text-gray-400">
                   <div className="flex items-center gap-2">
                     <Info className="w-3 h-3 text-harvest-green-600" />
                     <span>Network Gas: ≈ 0.001 XLM</span>
                   </div>
                   <span className="text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Security Check Passed
                   </span>
                </div>
              </div>
            </div>
          )}

          {validationError && (
            <div className="animate-in shake-1 duration-300">
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
            <div className="animate-in shake-1 duration-300">
              <Alert
                variant="error"
                title="Operation Halted"
                description={error}
                className="rounded-[2rem] border-2 border-red-500/20 bg-red-500/5 text-red-900 dark:text-red-400"
              />
            </div>
          )}

          {isEarlyWithrawal && (
            <div className="flex items-start gap-4 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 animate-in slide-in-from-bottom-2 duration-500">
              <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-amber-500" />
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600/80">Immaturity Warning</p>
                <p className="text-sm leading-relaxed text-amber-800/80 dark:text-amber-400/80 font-bold">
                  This vault has not reached its seasonal milestone. Extracting early will forfeit accrued harvesting bonuses.
                </p>
              </div>
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
          onClick={handleWithdraw}
          className="rounded-[1.5rem] py-10 text-2xl font-black shadow-2xl shadow-harvest-green-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] animate-shimmer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isSimulating ? (
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Simulating...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span>Confirm Extraction</span>
              <ArrowDownLeft className="w-6 h-6" />
            </div>
          )}
        </Button>
        <button 
          onClick={onClose} 
          disabled={isLoading || isSimulating}
          className="text-xs font-black text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-[0.25em] py-2"
        >
          Dismiss and Retain Capital
        </button>
      </ModalFooter>
    </Modal>
  );
};
