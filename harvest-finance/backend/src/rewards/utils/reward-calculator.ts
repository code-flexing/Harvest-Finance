/**
 * Calculate accrued reward for a single deposit.
 *
 * Formula: reward = depositAmount * (APY / 100) * (daysElapsed / 365)
 *
 * @param depositAmount - Confirmed deposit amount
 * @param apy - Annual Percentage Yield as percentage (e.g. 8 for 8%)
 * @param depositDate - Date the deposit was confirmed/created
 * @param asOf - Reference date for calculation (defaults to now)
 */
export function calculateDepositReward(
  depositAmount: number,
  apy: number,
  depositDate: Date,
  asOf: Date = new Date(),
): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysElapsed = Math.max(
    0,
    (asOf.getTime() - depositDate.getTime()) / msPerDay,
  );
  const reward = depositAmount * (apy / 100) * (daysElapsed / 365);
  return parseFloat(reward.toFixed(8));
}
