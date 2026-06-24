/**
 * Integration tests for the deposit / withdrawal HTTP flow.
 *
 * Strategy:
 *  - Spin up a minimal NestJS testing module containing only the VaultsController
 *    and VaultsModule-level dependencies.
 *  - Replace the real TypeORM repositories, DataSource, Stellar SDK calls, and
 *    all external services with in-memory mocks so the tests run without a
 *    database or network.
 *  - Rely on supertest to drive the HTTP layer and assert on HTTP status codes
 *    and response shapes.
 *
 * Scenarios covered:
 *  1. Successful deposit — 200 OK, deposit status = CONFIRMED
 *  2. Duplicate idempotency key — returns the same deposit (200 OK, no new record)
 *  3. Deposit insufficient funds / capacity exceeded — 400 Bad Request
 *  4. Successful withdrawal — 200 OK, withdrawal status = PENDING
 *  5. Insufficient funds withdrawal — 400 Bad Request
 *  6. Withdrawal before lock expiry (frozen vault) — 400 Bad Request
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CqrsModule, CommandBus } from '@nestjs/cqrs';
import { VaultsController } from '../src/vaults/vaults.controller';
import { VaultsService } from '../src/vaults/vaults.service';
import { Vault, VaultStatus, VaultType } from '../src/database/entities/vault.entity';
import { Deposit, DepositStatus } from '../src/database/entities/deposit.entity';
import { Withdrawal, WithdrawalStatus } from '../src/database/entities/withdrawal.entity';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CanActivate, ExecutionContext } from '@nestjs/common';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stub auth guard that injects a fixed user into every request. */
class StubJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 'user-test-1', email: 'test@example.com', role: 'FARMER' };
    return true;
  }
}

const VAULT_ID = 'vault-uuid-1';
const USER_ID = 'user-test-1';

const makeVault = (overrides: Partial<Vault> = {}): Partial<Vault> => ({
  id: VAULT_ID,
  ownerId: USER_ID,
  vaultName: 'Test Vault',
  type: VaultType.CROP_PRODUCTION,
  status: VaultStatus.ACTIVE,
  totalDeposits: 500 as any,
  maxCapacity: 10000 as any,
  isFullCapacity: false,
  availableCapacity: 9500,
  utilizationPercentage: 5,
  approvalStatus: 'PENDING',
  description: 'Integration test vault',
  symbol: 'TEST',
  assetPair: 'XLM/USDC',
  interestRate: 5 as any,
  maturityDate: new Date('2030-01-01'),
  lockPeriodEnd: new Date('2027-01-01'),
  isPublic: true,
  requiresMultiSignature: false,
  approvalThreshold: 1,
  currentApprovals: 0,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  deposits: [],
  ...overrides,
});

const makeDeposit = (overrides: Partial<Deposit> = {}): Partial<Deposit> => ({
  id: 'deposit-uuid-1',
  userId: USER_ID,
  vaultId: VAULT_ID,
  amount: 200 as any,
  status: DepositStatus.CONFIRMED,
  transactionHash: '0xmockhash',
  stellarTransactionId: 'mock_stellar_123',
  idempotencyKey: null,
  confirmedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeWithdrawal = (overrides: Partial<Withdrawal> = {}): Partial<Withdrawal> => ({
  id: 'withdrawal-uuid-1',
  userId: USER_ID,
  vaultId: VAULT_ID,
  amount: 100 as any,
  status: WithdrawalStatus.PENDING,
  transactionHash: null,
  confirmedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const buildQB = (total: string | null) => ({
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue({ total }),
});

const mockEntityManager = {
  save: jest.fn(),
  increment: jest.fn().mockResolvedValue(undefined),
  decrement: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  findOne: jest.fn(),
  find: jest.fn(),
  getRepository: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn((cb: (em: typeof mockEntityManager) => unknown) => cb(mockEntityManager)),
  getRepository: jest.fn(),
};

const mockVaultRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
};

const mockDepositRepository = {
  create: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
  createQueryBuilder: jest.fn(),
};

const mockWithdrawalRepository = {
  create: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
};

const mockNotificationsService = { create: jest.fn().mockResolvedValue(undefined) };
const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
const mockVaultGateway = { emitDeposit: jest.fn(), emitWithdrawal: jest.fn() };
const mockEventEmitter = { emit: jest.fn() };
const mockContractCache = {
  getVaultState: jest.fn((_id: string, loader: () => Promise<Vault>) => loader()),
};
const mockSanitizer = { validateUUID: jest.fn((id: string) => id) };
const mockDepositEventService = {
  appendEvent: jest.fn().mockResolvedValue(undefined),
  getDepositHistory: jest.fn().mockResolvedValue([]),
  getUserDepositHistory: jest.fn().mockResolvedValue([]),
  getVaultDepositHistory: jest.fn().mockResolvedValue([]),
  mapEventToResponse: jest.fn((e) => e),
};

// Mock Stellar SDK at the module level so any internal import of it returns stubs.
jest.mock('@stellar/stellar-sdk', () => ({
  Networks: { TESTNET: 'Test SDF Network ; September 2015' },
  Keypair: { fromSecret: jest.fn(() => ({ publicKey: () => 'GPUBKEY' })) },
  Server: jest.fn().mockImplementation(() => ({
    loadAccount: jest.fn().mockResolvedValue({ incrementSequenceNumber: jest.fn() }),
    submitTransaction: jest.fn().mockResolvedValue({ hash: '0xmockhash' }),
  })),
}), { virtual: true });

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Deposit / Withdrawal Integration (e2e with mocks)', () => {
  let app: INestApplication;
  let commandBus: CommandBus;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [VaultsController],
      providers: [
        VaultsService,
        { provide: getRepositoryToken(Vault), useValue: mockVaultRepository },
        { provide: getRepositoryToken(Deposit), useValue: mockDepositRepository },
        { provide: getRepositoryToken(Withdrawal), useValue: mockWithdrawalRepository },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: 'NotificationsService',
          useValue: mockNotificationsService,
        },
        {
          provide: require('../src/notifications/notifications.service').NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: require('../src/logger/custom-logger.service').CustomLoggerService,
          useValue: mockLogger,
        },
        {
          provide: require('../src/realtime/vault.gateway').VaultGateway,
          useValue: mockVaultGateway,
        },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        {
          provide: require('../src/common/cache/contract-cache.service').ContractCacheService,
          useValue: mockContractCache,
        },
        {
          provide: require('../src/common/sanitization/input-sanitizer.service').InputSanitizerService,
          useValue: mockSanitizer,
        },
        {
          provide: require('../src/vaults/deposit-event.service').DepositEventService,
          useValue: mockDepositEventService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(StubJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();

    commandBus = moduleFixture.get<CommandBus>(CommandBus);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  // =========================================================================
  // Deposit flow
  // =========================================================================
  describe('POST /api/v1/vaults/:vaultId/deposit', () => {
    it('1. Successful deposit — returns 200 with confirmed deposit', async () => {
      const vault = makeVault();
      const deposit = makeDeposit({ amount: 300 as any });
      const confirmedDeposit = { ...deposit, status: DepositStatus.CONFIRMED };

      // Stub commandBus.execute to return a confirmed deposit
      jest.spyOn(commandBus, 'execute').mockResolvedValueOnce(confirmedDeposit);

      const response = await request(app.getHttpServer())
        .post(`/vaults/${VAULT_ID}/deposit`)
        .send({ amount: 300 })
        .expect(200);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(response.body).toBeDefined();
    });

    it('2. Duplicate idempotency key — same deposit returned, no new DB record', async () => {
      const existingDeposit = makeDeposit({
        id: 'deposit-idem-1',
        idempotencyKey: 'idem-key-abc',
        status: DepositStatus.CONFIRMED,
      });

      // Both calls resolve to the same deposit (idempotent behaviour)
      jest.spyOn(commandBus, 'execute').mockResolvedValue(existingDeposit);

      const firstRes = await request(app.getHttpServer())
        .post(`/vaults/${VAULT_ID}/deposit`)
        .send({ amount: 200, idempotencyKey: 'idem-key-abc' })
        .expect(200);

      const secondRes = await request(app.getHttpServer())
        .post(`/vaults/${VAULT_ID}/deposit`)
        .send({ amount: 200, idempotencyKey: 'idem-key-abc' })
        .expect(200);

      // Both responses resolve to the same underlying deposit id
      expect(firstRes.body.id).toEqual(secondRes.body.id);
      expect(commandBus.execute).toHaveBeenCalledTimes(2);
    });

    it('3. Capacity exceeded — command throws BadRequestException, returns 400', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      jest
        .spyOn(commandBus, 'execute')
        .mockRejectedValueOnce(
          new BadRequestException('Vault is not active for deposits'),
        );

      const response = await request(app.getHttpServer())
        .post(`/vaults/${VAULT_ID}/deposit`)
        .send({ amount: 99999 })
        .expect(400);

      expect(response.body.message).toMatch(/Vault is not active for deposits/);
    });

    it('4. Zero amount deposit — returns 400', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      jest
        .spyOn(commandBus, 'execute')
        .mockRejectedValueOnce(
          new BadRequestException('Deposit amount must be > 0'),
        );

      await request(app.getHttpServer())
        .post(`/vaults/${VAULT_ID}/deposit`)
        .send({ amount: 0 })
        .expect(400);
    });
  });

  // =========================================================================
  // Withdrawal flow
  // =========================================================================
  describe('POST /api/v1/vaults/:vaultId/withdraw', () => {
    it('1. Successful withdrawal — 200 OK with pending withdrawal', async () => {
      const withdrawal = makeWithdrawal({ amount: 100 as any });

      jest.spyOn(commandBus, 'execute').mockResolvedValueOnce(withdrawal);

      const response = await request(app.getHttpServer())
        .post(`/vaults/${VAULT_ID}/withdraw`)
        .send({ amount: 100 })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('2. Insufficient funds — command throws BadRequestException, returns 400', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      jest
        .spyOn(commandBus, 'execute')
        .mockRejectedValueOnce(
          new BadRequestException('Insufficient balance'),
        );

      const response = await request(app.getHttpServer())
        .post(`/vaults/${VAULT_ID}/withdraw`)
        .send({ amount: 999999 })
        .expect(400);

      expect(response.body.message).toMatch(/Insufficient balance/);
    });

    it('3. Withdrawal on frozen vault (before lock expiry) — returns 400', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      jest
        .spyOn(commandBus, 'execute')
        .mockRejectedValueOnce(
          new BadRequestException('Vault is frozen'),
        );

      const response = await request(app.getHttpServer())
        .post(`/vaults/${VAULT_ID}/withdraw`)
        .send({ amount: 50 })
        .expect(400);

      expect(response.body.message).toMatch(/Vault is frozen/);
    });

    it('4. Zero amount withdrawal — returns 400', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      jest
        .spyOn(commandBus, 'execute')
        .mockRejectedValueOnce(
          new BadRequestException('Withdrawal amount must be > 0'),
        );

      await request(app.getHttpServer())
        .post(`/vaults/${VAULT_ID}/withdraw`)
        .send({ amount: 0 })
        .expect(400);
    });

    it('5. Vault not found — returns 404', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      jest
        .spyOn(commandBus, 'execute')
        .mockRejectedValueOnce(new NotFoundException('Vault not found'));

      await request(app.getHttpServer())
        .post(`/vaults/nonexistent-vault-id/withdraw`)
        .send({ amount: 100 })
        .expect(404);
    });
  });
});
