import { faker } from '@faker-js/faker';

export interface VaultDTO {
  id: string;
  name: string;
  tokenAddress: string;
  totalAssets: string; // decimal as string
  ownerId: string; // user id
  tvlAtHighWatermark: string; // all-time high TVL watermark as decimal string
  watermarkAchievedAt: string | null; // ISO timestamp when ATH was reached
  createdAt: string;
}

export class VaultFactory {
  /**
   * Create a realistic VaultDTO. Pass overrides to customize fields.
   * The watermark is always >= totalAssets to reflect realistic state.
   */
  static create(overrides: Partial<VaultDTO> = {}): VaultDTO {
    const totalAssets =
      overrides.totalAssets ??
      faker.finance.amount({ min: 1000, max: 1_000_000, dec: 2 }).toString();

    // Watermark is always >= totalAssets (monotonically increasing invariant)
    const tvlAtHighWatermark =
      overrides.tvlAtHighWatermark ??
      faker.finance
        .amount({ min: parseFloat(totalAssets), max: parseFloat(totalAssets) * 1.5, dec: 2 })
        .toString();

    const vault: VaultDTO = {
      id: overrides.id ?? faker.string.uuid(),
      name: overrides.name ?? `${faker.company.name()} Vault`,
      tokenAddress: overrides.tokenAddress ?? faker.finance.ethereumAddress(),
      totalAssets,
      ownerId: overrides.ownerId ?? faker.string.uuid(),
      tvlAtHighWatermark,
      watermarkAchievedAt:
        overrides.watermarkAchievedAt !== undefined
          ? overrides.watermarkAchievedAt
          : new Date(faker.date.past({ years: 1 })).toISOString(),
      createdAt: overrides.createdAt ?? new Date(faker.date.past({ years: 1 })).toISOString(),
    };

    return { ...vault, ...overrides };
  }
}
