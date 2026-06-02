import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { Deposit, DepositStatus } from '../entities/deposit.entity';
import { User, UserRole } from '../entities/user.entity';
import {
  Vault,
  VaultStatus,
  VaultType,
} from '../entities/vault.entity';
import { VaultDeposit } from '../entities/vault-deposit.entity';

const DEFAULT_PASSWORD = 'password123';
const SEED_USER_COUNT = 18;
const SEED_VAULT_COUNT = 10;
const SEED_DEPOSIT_COUNT = 48;

interface SeedResult {
  users: User[];
  vaults: Vault[];
  deposits: Deposit[];
  vaultDeposits: VaultDeposit[];
}

const cropThemes = [
  'Cassava',
  'Maize',
  'Rice',
  'Soybean',
  'Cocoa',
  'Tomato',
  'Groundnut',
  'Sorghum',
];

const vaultTypeLabels: Record<VaultType, string> = {
  [VaultType.CROP_PRODUCTION]: 'Production',
  [VaultType.EQUIPMENT_FINANCING]: 'Equipment',
  [VaultType.LAND_ACQUISITION]: 'Land',
  [VaultType.INSURANCE_FUND]: 'Insurance',
  [VaultType.EMERGENCY_FUND]: 'Emergency',
};

export async function generateSeedData(
  dataSource: DataSource,
): Promise<SeedResult> {
  faker.seed(20260602);

  const userRepository = dataSource.getRepository(User);
  const vaultRepository = dataSource.getRepository(Vault);
  const depositRepository = dataSource.getRepository(Deposit);
  const vaultDepositRepository = dataSource.getRepository(VaultDeposit);
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const users = await userRepository.save(createUsers(hashedPassword));
  const farmers = users.filter((user) => user.role === UserRole.FARMER);
  const vaults = await vaultRepository.save(createVaults(farmers));
  const deposits = await depositRepository.save(createDeposits(users, vaults));
  await updateVaultTotals(vaultRepository, vaults, deposits);
  const vaultDeposits = await vaultDepositRepository.save(
    createVaultDepositBalances(users, vaults, deposits),
  );

  console.log('Seed data created successfully.');
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Vaults: ${vaults.length}`);
  console.log(`   - Deposits: ${deposits.length}`);
  console.log(`   - Vault balances: ${vaultDeposits.length}`);
  console.log(`   - Default password: ${DEFAULT_PASSWORD}`);

  return {
    users,
    vaults,
    deposits,
    vaultDeposits,
  };
}

export async function clearSeedData(dataSource: DataSource): Promise<void> {
  await dataSource.query('DELETE FROM vault_deposits');
  await dataSource.query('DELETE FROM deposits');
  await dataSource.query('DELETE FROM vaults');
  await dataSource.query('DELETE FROM credit_scores');
  await dataSource.query('DELETE FROM verifications');
  await dataSource.query('DELETE FROM transactions');
  await dataSource.query('DELETE FROM orders');
  await dataSource.query('DELETE FROM farm_vaults');
  await dataSource.query('DELETE FROM crop_cycles');
  await dataSource.query('DELETE FROM users');
  console.log('Seed data cleared.');
}

function createUsers(hashedPassword: string): Partial<User>[] {
  const roles = [
    ...Array<UserRole>(10).fill(UserRole.FARMER),
    ...Array<UserRole>(5).fill(UserRole.BUYER),
    ...Array<UserRole>(2).fill(UserRole.INSPECTOR),
    UserRole.ADMIN,
  ];

  return faker.helpers.shuffle(roles).slice(0, SEED_USER_COUNT).map((role) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: hashedPassword,
      role,
      firstName,
      lastName,
      stellarAddress: createStellarAddress(),
      phone: faker.phone.number(),
      address: `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.country()}`,
      profileImageUrl: faker.image.avatar(),
      isActive: faker.datatype.boolean({ probability: 0.94 }),
      lastLogin: faker.date.recent({ days: 30 }),
    };
  });
}

function createVaults(farmers: User[]): Partial<Vault>[] {
  return Array.from({ length: SEED_VAULT_COUNT }, () => {
    const owner = faker.helpers.arrayElement(farmers);
    const type = faker.helpers.enumValue(VaultType);
    const crop = faker.helpers.arrayElement(cropThemes);
    const maxCapacity = faker.number.float({
      min: 25_000,
      max: 350_000,
      fractionDigits: 2,
    });
    const requiresMultiSignature = faker.datatype.boolean({
      probability: 0.25,
    });

    return {
      ownerId: owner.id,
      type,
      status: VaultStatus.ACTIVE,
      vaultName: `${crop} ${vaultTypeLabels[type]} Vault`,
      description: faker.lorem.sentence({ min: 10, max: 18 }),
      symbol: `HV${crop.slice(0, 3).toUpperCase()}`,
      assetPair: faker.helpers.arrayElement(['XLM/USDC', 'XLM/HVF', 'USDC/HVF']),
      totalDeposits: 0,
      maxCapacity,
      interestRate: faker.number.float({
        min: 4.5,
        max: 18,
        fractionDigits: 2,
      }),
      maturityDate: faker.date.future({ years: 3 }),
      lockPeriodEnd: faker.date.future({ years: 1 }),
      isPublic: faker.datatype.boolean({ probability: 0.9 }),
      requiresMultiSignature,
      approvalThreshold: requiresMultiSignature
        ? faker.number.int({ min: 2, max: 3 })
        : 1,
      currentApprovals: requiresMultiSignature
        ? faker.number.int({ min: 0, max: 2 })
        : 0,
    };
  });
}

function createDeposits(users: User[], vaults: Vault[]): Partial<Deposit>[] {
  return Array.from({ length: SEED_DEPOSIT_COUNT }, () => {
    const status = faker.helpers.weightedArrayElement([
      { weight: 8, value: DepositStatus.CONFIRMED },
      { weight: 2, value: DepositStatus.PENDING },
      { weight: 1, value: DepositStatus.REFUNDED },
      { weight: 1, value: DepositStatus.FAILED },
    ]);
    const createdAt = faker.date.recent({ days: 120 });
    const confirmedAt =
      status === DepositStatus.CONFIRMED
        ? faker.date.between({ from: createdAt, to: new Date() })
        : null;

    return {
      userId: faker.helpers.arrayElement(users).id,
      vaultId: faker.helpers.arrayElement(vaults).id,
      status,
      amount: faker.number.float({
        min: 100,
        max: 12_500,
        fractionDigits: 2,
      }),
      transactionHash: status === DepositStatus.FAILED ? null : createTxHash(),
      stellarTransactionId:
        status === DepositStatus.FAILED ? null : faker.string.alphanumeric(64),
      confirmedAt,
      notes: faker.helpers.maybe(() => faker.finance.transactionDescription(), {
        probability: 0.35,
      }),
      idempotencyKey: faker.string.uuid(),
      createdAt,
      updatedAt: confirmedAt ?? createdAt,
    };
  });
}

async function updateVaultTotals(
  vaultRepository: Repository<Vault>,
  vaults: Vault[],
  deposits: Deposit[],
): Promise<void> {
  const totalsByVaultId = deposits.reduce<Record<string, number>>(
    (totals, deposit) => {
      if (deposit.status !== DepositStatus.CONFIRMED) return totals;
      totals[deposit.vaultId] =
        (totals[deposit.vaultId] ?? 0) + Number(deposit.amount);
      return totals;
    },
    {},
  );

  await Promise.all(
    vaults.map((vault) => {
      const totalDeposits = Number((totalsByVaultId[vault.id] ?? 0).toFixed(2));
      const status =
        totalDeposits >= Number(vault.maxCapacity)
          ? VaultStatus.FULL_CAPACITY
          : VaultStatus.ACTIVE;

      return vaultRepository.update(vault.id, { totalDeposits, status });
    }),
  );
}

function createVaultDepositBalances(
  users: User[],
  vaults: Vault[],
  deposits: Deposit[],
): Partial<VaultDeposit>[] {
  const balances = deposits.reduce<Record<string, Partial<VaultDeposit>>>(
    (accumulator, deposit) => {
      if (deposit.status !== DepositStatus.CONFIRMED) return accumulator;

      const key = `${deposit.userId}:${deposit.vaultId}`;
      const user = users.find((candidate) => candidate.id === deposit.userId);
      const vault = vaults.find((candidate) => candidate.id === deposit.vaultId);
      if (!user || !vault) return accumulator;

      accumulator[key] = {
        user,
        vault,
        balance:
          Number(accumulator[key]?.balance ?? 0) + Number(deposit.amount),
      };
      return accumulator;
    },
    {},
  );

  return Object.values(balances).map((balance) => ({
    ...balance,
    balance: Number(Number(balance.balance).toFixed(2)),
  }));
}

function createStellarAddress(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.split('');
  const publicKey = Array.from({ length: 55 }, () =>
    faker.helpers.arrayElement(alphabet),
  ).join('');

  return `G${publicKey}`;
}

function createTxHash(): string {
  return faker.string.hexadecimal({ length: 64, prefix: '0x' });
}
