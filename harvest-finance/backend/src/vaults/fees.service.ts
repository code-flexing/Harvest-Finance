import { BadRequestException, Injectable } from '@nestjs/common';

// Platform-wide maximums (configurable via env; hard-coded fallbacks)
const MAX_ENTRY_FEE_BPS = parseInt(process.env.MAX_ENTRY_FEE_BPS ?? '500', 10);   // 5%
const MAX_EXIT_FEE_BPS = parseInt(process.env.MAX_EXIT_FEE_BPS ?? '500', 10);      // 5%
const MAX_PERFORMANCE_FEE_BPS = parseInt(process.env.MAX_PERFORMANCE_FEE_BPS ?? '3000', 10); // 30%

export interface FeeBreakdown {
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  feeBps: number;
}

@Injectable()
export class FeesService {
  validateFees(entryFeeBps: number, exitFeeBps: number, performanceFeeBps: number): void {
    if (entryFeeBps < 0 || entryFeeBps > MAX_ENTRY_FEE_BPS) {
      throw new BadRequestException(
        `Entry fee must be between 0 and ${MAX_ENTRY_FEE_BPS} bps (${MAX_ENTRY_FEE_BPS / 100}%)`,
      );
    }
    if (exitFeeBps < 0 || exitFeeBps > MAX_EXIT_FEE_BPS) {
      throw new BadRequestException(
        `Exit fee must be between 0 and ${MAX_EXIT_FEE_BPS} bps (${MAX_EXIT_FEE_BPS / 100}%)`,
      );
    }
    if (performanceFeeBps < 0 || performanceFeeBps > MAX_PERFORMANCE_FEE_BPS) {
      throw new BadRequestException(
        `Performance fee must be between 0 and ${MAX_PERFORMANCE_FEE_BPS} bps (${MAX_PERFORMANCE_FEE_BPS / 100}%)`,
      );
    }
  }

  calculateFee(grossAmount: number, feeBps: number): FeeBreakdown {
    const feeAmount = Math.round(grossAmount * feeBps) / 10000;
    return {
      grossAmount,
      feeAmount,
      netAmount: grossAmount - feeAmount,
      feeBps,
    };
  }

  get platformMaxEntryFeeBps(): number {
    return MAX_ENTRY_FEE_BPS;
  }

  get platformMaxExitFeeBps(): number {
    return MAX_EXIT_FEE_BPS;
  }

  get platformMaxPerformanceFeeBps(): number {
    return MAX_PERFORMANCE_FEE_BPS;
  }
}
