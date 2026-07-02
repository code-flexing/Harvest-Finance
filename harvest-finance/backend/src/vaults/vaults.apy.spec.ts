import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { VaultsService } from './vaults.service';
import { Vault, VaultStatus, VaultType } from '../database/entities/vault.entity';
import { Deposit } from '../database/entities/deposit.entity';
import { Withdrawal } from '../database/entities/withdrawal.entity';
import { Strategy, CompoundingFrequency } from '../database/entities/strategy.entity';
import { VaultApyHistory } from '../database/entities/vault-apy-history.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { VaultGateway } from '../realtime/vault.gateway';
import { ContractCacheService } from '../common/cache/contract-cache.service';
import { InputSanitizerService } from '../common/sanitization/input-sanitizer.service';
import { DepositEventService } from './deposit-event.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthService } from '../auth/auth.service';

describe('VaultsService APY behavior', () => {
  let service: VaultsService;
  const mockVaultRepository = { findOne: jest.fn(), update: jest.fn(), find: jest.fn(), save: jest.fn(), create: jest.fn() };
  const mockDepositRepository = { create: jest.fn(), findOne: jest.fn(), find: jest.fn(), update: jest.fn(), createQueryBuilder: jest.fn() };
  const mockWithdrawalRepository = { create: jest.fn(), findOne: jest.fn(), update: jest.fn() };
  const mockStrategyRepository = { findOne: jest.fn() };
  const mockApyHistoryRepository = { create: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() };
  const mockDataSource = { transaction: jest.fn(), getRepository: jest.fn(), createQueryBuilder: jest.fn() };
  const mockNotificationsService = { create: jest.fn() };
  const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
  const mockVaultGateway = { emitDeposit: jest.fn(), emitWithdrawal: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };
  const mockContractCache = { getVaultState: jest.fn((_id: string, loader: () => Promise<Vault>) => loader()) };
  const mockSanitizer = { validateUUID: jest.fn((id: string) => id) };
  const mockDepositEventService = { appendEvent: jest.fn(), getDepositHistory: jest.fn(), getUserDepositHistory: jest.fn(), getVaultDepositHistory: jest.fn(), mapEventToResponse: jest.fn() };
  const mockAuthService = { isEmailVerified: jest.fn().mockResolvedValue(true) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultsService,
        { provide: getRepositoryToken(Vault), useValue: mockVaultRepository },
        { provide: getRepositoryToken(Deposit), useValue: mockDepositRepository },
        { provide: getRepositoryToken(Withdrawal), useValue: mockWithdrawalRepository },
        { provide: getRepositoryToken(Strategy), useValue: mockStrategyRepository },
        { provide: getRepositoryToken(VaultApyHistory), useValue: mockApyHistoryRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: CustomLoggerService, useValue: mockLogger },
        { provide: VaultGateway, useValue: mockVaultGateway },
        { provide: ContractCacheService, useValue: mockContractCache },
        { provide: InputSanitizerService, useValue: mockSanitizer },
        { provide: DepositEventService, useValue: mockDepositEventService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<VaultsService>(VaultsService);
  });

  it('calculates APY for daily, weekly, and monthly compounding', () => {
    expect(service.calculateApy(5, CompoundingFrequency.DAILY)).toBeCloseTo(5.13, 2);
    expect(service.calculateApy(5, CompoundingFrequency.WEEKLY)).toBeCloseTo(5.12, 2);
    expect(service.calculateApy(5, CompoundingFrequency.MONTHLY)).toBeCloseTo(5.11, 2);
  });

  it('returns zero APY for zero APR and defaults invalid frequencies to daily', () => {
    expect(service.calculateApy(0, CompoundingFrequency.DAILY)).toBe(0);
    expect(service.calculateApy(5, 'invalid' as CompoundingFrequency)).toBeCloseTo(5.13, 2);
  });

  it('persists a daily snapshot with APR and APY for a vault', async () => {
    const insertBuilder = {
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    mockDataSource.createQueryBuilder.mockReturnValue(insertBuilder);
    mockVaultRepository.findOne.mockResolvedValue({
      id: 'vault-1',
      interestRate: 5,
      strategy: { compoundingFrequency: CompoundingFrequency.MONTHLY },
    });

    await service.recordApySnapshot('vault-1');

    expect(insertBuilder.values).toHaveBeenCalledWith(expect.objectContaining({
      vault_id: 'vault-1',
      apr: 5,
      apy: expect.any(Number),
      snapshot_date: expect.any(Date),
    }));
  });

  it('includes compounding frequency in the vault response payload', () => {
    const vault = {
      id: 'vault-1',
      ownerId: 'user-1',
      type: VaultType.CROP_PRODUCTION,
      status: VaultStatus.ACTIVE,
      vaultName: 'Test Vault',
      description: 'Test vault description',
      symbol: 'TEST',
      assetPair: 'XLM/USDC',
      totalDeposits: 1000,
      maxCapacity: 10000,
      interestRate: 5,
      maturityDate: null,
      lockPeriodEnd: null,
      isPublic: true,
      requiresMultiSignature: false,
      approvalThreshold: 1,
      currentApprovals: 0,
      strategy: { compoundingFrequency: CompoundingFrequency.WEEKLY },
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      availableCapacity: 9000,
      utilizationPercentage: 10,
      approvalStatus: 'NOT_REQUIRED',
    } as Vault;

    const response = service.mapVaultToResponse(vault);

    expect(response.apr).toBe(5);
    expect(response.apy).toBeCloseTo(5.12, 2);
    expect(response.compoundingFrequency).toBe(CompoundingFrequency.WEEKLY);
  });
});
