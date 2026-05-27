"use client";

import { useMemo } from "react";
import { useWalletStore, type WalletState } from "@/store/wallet";

export interface ValidationResult {
  isValid: boolean;
  isOverBalance: boolean;
  isInsufficientGas: boolean;
  isLowGas: boolean;
  gasRequired: number;
  xlmBalance: number;
  errorMessage: string | null;
  warningMessage: string | null;
}

const GAS_DEPOSIT = 0.001;
const GAS_WITHDRAW = 0.001;
const GAS_LOW_THRESHOLD = 2.0;

function parseBalance(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  const cleaned = String(value).replace(/,/g, "");
  return parseFloat(cleaned) || 0;
}

export function useTransactionValidation({
  amount,
  availableBalance,
  assetSymbol,
  operation = "deposit",
}: {
  amount: string;
  availableBalance: string | number;
  assetSymbol: string;
  operation?: "deposit" | "withdraw";
}): ValidationResult {
  const xlmBalance = useWalletStore((state: WalletState) => state.getXlmBalance());

  return useMemo(() => {
    const numericAmount = parseFloat(amount) || 0;
    const balanceNum = parseBalance(availableBalance);
    const gasRequired = operation === "deposit" ? GAS_DEPOSIT : GAS_WITHDRAW;

    const isOverBalance = numericAmount > balanceNum && numericAmount > 0;
    const isInsufficientGas = xlmBalance < gasRequired;
    const isLowGas = xlmBalance < GAS_LOW_THRESHOLD && xlmBalance >= gasRequired;
    const isValid = numericAmount > 0 && !isOverBalance && !isInsufficientGas;

    let errorMessage: string | null = null;
    let warningMessage: string | null = null;

    if (numericAmount <= 0) {
      errorMessage = null;
    } else if (isOverBalance) {
      errorMessage = `Insufficient balance. You have ${balanceNum.toLocaleString()} ${assetSymbol} but tried to use ${numericAmount.toLocaleString()} ${assetSymbol}.`;
    } else if (isInsufficientGas) {
      errorMessage = `Insufficient XLM for network gas. You need at least ${gasRequired} XLM for fees, but only have ${xlmBalance.toLocaleString()} XLM.`;
    }

    if (isLowGas && !isOverBalance && numericAmount > 0) {
      warningMessage = `Low XLM balance (${xlmBalance.toLocaleString()} XLM). Keep at least ${GAS_LOW_THRESHOLD} XLM for future gas fees.`;
    }

    return {
      isValid,
      isOverBalance,
      isInsufficientGas,
      isLowGas,
      gasRequired,
      xlmBalance,
      errorMessage,
      warningMessage,
    };
  }, [amount, availableBalance, assetSymbol, operation, xlmBalance]);
}
