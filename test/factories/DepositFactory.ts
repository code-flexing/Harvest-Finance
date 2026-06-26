import { faker } from '@faker-js/faker';

export interface DepositDTO {
  id: string;
  userId: string;
  vaultId: string;
  amount: string; // decimal string
  txHash: string;
  timestamp: string;
}

export class DepositFactory {
  /**
   * Create a realistic DepositDTO. Pass overrides to customize fields.
   */
  static create(overrides: Partial<DepositDTO> = {}): DepositDTO {
    const deposit: DepositDTO = {
      id: overrides.id ?? faker.string.uuid(),
      userId: overrides.userId ?? faker.string.uuid(),
      vaultId: overrides.vaultId ?? faker.string.uuid(),
      amount: overrides.amount ?? faker.finance.amount({ min: 0.01, max: 100_000, dec: 6 }).toString(),
      txHash: overrides.txHash ?? faker.finance.bitcoinAddress(),
      timestamp: overrides.timestamp ?? new Date(faker.date.recent({ days: 90 })).toISOString(),
    };

    return { ...deposit, ...overrides };
  }
}
