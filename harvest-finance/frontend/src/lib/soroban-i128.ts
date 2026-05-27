// src/lib/soroban-i128.ts
// Soroban i128 conversion utilities for Stellar token amounts
// 1 USDC = 10,000,000 in i128 (7 decimal places)

const SCALE = 10_000_000n;
const SCALE_NUM = 10_000_000;

/**
 * Convert a human-readable amount to a Soroban i128 bigint.
 * Returns 0n for negative input.
 */
export function toI128(amount: number): bigint {
  if (amount < 0) return 0n;
  return BigInt(Math.round(amount * SCALE_NUM));
}

/**
 * Convert a Soroban i128 bigint to a human-readable number.
 */
export function fromI128(amount: bigint): number {
  return Number(amount) / SCALE_NUM;
}

/**
 * Format an i128 bigint as a human-readable string.
 * @param amount  i128 bigint value
 * @param decimals  number of decimal places (default: 2)
 */
export function formatI128(amount: bigint, decimals = 2): string {
  return fromI128(amount).toFixed(decimals);
}

/**
 * Estimate shares received for a deposit.
 * Returns 0 when totalAssets <= 0 to avoid division by zero.
 */
export function calculateEstimatedShares(
  depositAmount: number,
  totalAssets: number,
  totalShares: number,
): number {
  if (totalAssets <= 0) return 0;
  return (depositAmount / totalAssets) * totalShares;
}

/**
 * Estimate assets received for a withdrawal.
 * Returns 0 when totalShares <= 0 to avoid division by zero.
 */
export function calculateEstimatedAssets(
  shares: number,
  totalAssets: number,
  totalShares: number,
): number {
  if (totalShares <= 0) return 0;
  return (shares / totalShares) * totalAssets;
}
