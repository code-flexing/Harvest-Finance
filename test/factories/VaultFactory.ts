import { faker } from '@faker-js/faker';

export interface VaultDTO {
  id: string;
  name: string;
  tokenAddress: string;
  totalAssets: string; // decimal as string
  ownerId: string; // user id
  createdAt: string;
}

export class VaultFactory {
  /**
   * Create a realistic VaultDTO. Pass overrides to customize fields.
   */
  static create(overrides: Partial<VaultDTO> = {}): VaultDTO {
    const vault: VaultDTO = {
      id: overrides.id ?? faker.string.uuid(),
      name: overrides.name ?? `${faker.company.name()} Vault`,
      tokenAddress: overrides.tokenAddress ?? faker.finance.ethereumAddress(),
      totalAssets: overrides.totalAssets ?? faker.finance.amount({ min: 1000, max: 1_000_000, dec: 2 }).toString(),
      ownerId: overrides.ownerId ?? faker.string.uuid(),
      createdAt: overrides.createdAt ?? new Date(faker.date.past({ years: 1 })).toISOString(),
    };

    return { ...vault, ...overrides };
  }
}
