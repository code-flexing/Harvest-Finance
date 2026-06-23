import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VaultsService } from './vaults.service';
import {
  Vault,
  VaultStatus,
  VaultType,
} from '../database/entities/vault.entity';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';
import {
  Withdrawal,
  WithdrawalStatus,
} from '../database/entities/withdrawal.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { VaultGateway } from '../realtime/vault.gateway';
import { ContractCacheService } from '../common/cache/contract-cache.service';
import { InputSanitizerService } from '../common/sanitization/input-sanitizer.service';
import { DepositEventService } from './deposit-event.service';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_USER_ID = '99999999-9999-9999-9999-999999999999';
const VAULT_ID = '22222222-2222-2222-2222-222222222222';
const CLONED_VAULT_ID = '55555555-5555-5555-5555-555555555555';
const DEPOSIT_ID = '33333333-3333-3333-3333-333333333333';
const WITHDRAWAL_ID = '44444444-4444-4444-4444-444444444444';

const buildVault = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: VAULT_ID,
  ownerId: USER_ID,
  type: VaultType.CROP_PRODUCTION,
  status: VaultStatus.ACTIVE,
  vaultName: 'Harvest Yield Vault',
  description: 'Template vault',
  symbol: 'HVF',
  assetPair: 'XLM/USDC',
  totalDeposits: 5000,
  maxCapacity: 10000,
  interestRate: 5,
  isPublic: true,
  requiresMultiSignature: true,
  approvalThreshold: 2,
  currentApprovals: 1,
  maturityDate: null,
  lockPeriodEnd: null,
  deposits: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  isFullCapacity: false,
  availableCapacity: 10000,
  utilizationPercentage: 0,
  ...overrides,
});

describe('VaultsService — Yield Strategy Integration', () => {
  let service: VaultsService;

  const mockManager = {
    save: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((cb: (em: typeof mockManager) => unknown) =>
      cb(mockManager),
    ),
  };

  const mockVaultRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockDepositRepository = {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockWithdrawalRepository = {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn().mockResolvedValue(undefined),
  };
  const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
  const mockVaultGateway = {
    emitDeposit: jest.fn(),
    emitWithdrawal: jest.fn(),
  };
  const mockContractCache = {
    getVaultState: jest.fn((_id: string, loader: () => Promise<unknown>) =>
      loader(),
    ),
  };
  const mockSanitizer = {
    validateUUID: jest.fn((id: string) => id),
  };
  const mockDepositEventService = {
    appendEvent: jest.fn().mockResolvedValue(undefined),
    getDepositHistory: jest.fn().mockResolvedValue([]),
    getUserDepositHistory: jest.fn().mockResolvedValue([]),
    getVaultDepositHistory: jest.fn().mockResolvedValue([]),
    mapEventToResponse: jest.fn((event) => event),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultsService,
        { provide: getRepositoryToken(Vault), useValue: mockVaultRepository },
        {
          provide: getRepositoryToken(Deposit),
          useValue: mockDepositRepository,
        },
        {
          provide: getRepositoryToken(Withdrawal),
          useValue: mockWithdrawalRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: CustomLoggerService, useValue: mockLogger },
        { provide: VaultGateway, useValue: mockVaultGateway },
        { provide: ContractCacheService, useValue: mockContractCache },
        { provide: InputSanitizerService, useValue: mockSanitizer },
        { provide: DepositEventService, useValue: mockDepositEventService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<VaultsService>(VaultsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── Service bootstrap ──────────────────────────────────────────────────────

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── Deposit flow ───────────────────────────────────────────────────────────

  describe('depositToVault — fund deposit flow', () => {
    const pendingDeposit = {
      id: DEPOSIT_ID,
      userId: USER_ID,
      vaultId: VAULT_ID,
      amount: 1000,
      status: DepositStatus.PENDING,
    };

    const confirmedDeposit = {
      ...pendingDeposit,
      status: DepositStatus.CONFIRMED,
      transactionHash: 'mock_tx_123',
      confirmedAt: new Date(),
    };

    const buildQB = (total: string | null) => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total }),
    });

    it('should route funds from user into vault and confirm deposit atomically', async () => {
      const vault = buildVault();
      const updatedVault = buildVault({
        totalDeposits: 1000,
        availableCapacity: 9000,
        utilizationPercentage: 10,
      });

      mockVaultRepository.findOne.mockResolvedValue(vault);
      mockDepositRepository.create.mockReturnValue(pendingDeposit);
      mockManager.save.mockResolvedValue(pendingDeposit);
      mockManager.increment.mockResolvedValue(undefined);
      mockManager.findOne.mockResolvedValue(updatedVault);
      mockDepositRepository.findOne
        .mockResolvedValueOnce(pendingDeposit)
        .mockResolvedValueOnce(confirmedDeposit);
      mockDepositRepository.update.mockResolvedValue(undefined);
      mockDepositRepository.createQueryBuilder.mockReturnValue(buildQB('1000'));

      const result = await service.depositToVault(VAULT_ID, {
        userId: USER_ID,
        amount: 1000,
      });

      expect(result.deposit.status).toBe(DepositStatus.CONFIRMED);
      expect(result.deposit.amount).toBe(1000);
      expect(result.userTotalDeposits).toBe(1000);
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockDepositEventService.appendEvent).toHaveBeenCalledTimes(2);
      expect(mockManager.increment).toHaveBeenCalledWith(
        Vault,
        { id: VAULT_ID },
        'totalDeposits',
        1000,
      );
    });

    it('should emit real-time deposit event to strategy subscribers', async () => {
      const vault = buildVault();
      const updatedVault = buildVault({ totalDeposits: 500 });

      mockVaultRepository.findOne.mockResolvedValue(vault);
      mockDepositRepository.create.mockReturnValue({
        ...pendingDeposit,
        amount: 500,
      });
      mockManager.save.mockResolvedValue({ ...pendingDeposit, amount: 500 });
      mockManager.increment.mockResolvedValue(undefined);
      mockManager.findOne.mockResolvedValue(updatedVault);
      mockDepositRepository.findOne
        .mockResolvedValueOnce({ ...pendingDeposit, amount: 500 })
        .mockResolvedValueOnce({ ...confirmedDeposit, amount: 500 });
      mockDepositRepository.update.mockResolvedValue(undefined);
      mockDepositRepository.createQueryBuilder.mockReturnValue(buildQB('500'));

      await service.depositToVault(VAULT_ID, { userId: USER_ID, amount: 500 });

      expect(mockVaultGateway.emitDeposit).toHaveBeenCalledWith(
        expect.objectContaining({
          vaultId: VAULT_ID,
          amount: 500,
          userId: USER_ID,
        }),
      );
    });

    it('should trigger large deposit alert when amount >= 10,000', async () => {
      const vault = buildVault({
        maxCapacity: 100000,
        availableCapacity: 100000,
      });
      const updatedVault = buildVault({
        totalDeposits: 10000,
        maxCapacity: 100000,
      });
      const largeDeposit = { ...pendingDeposit, amount: 10000 };
      const largeConfirmed = { ...confirmedDeposit, amount: 10000 };

      mockVaultRepository.findOne.mockResolvedValue(vault);
      mockDepositRepository.create.mockReturnValue(largeDeposit);
      mockManager.save.mockResolvedValue(largeDeposit);
      mockManager.increment.mockResolvedValue(undefined);
      mockManager.findOne.mockResolvedValue(updatedVault);
      mockDepositRepository.findOne
        .mockResolvedValueOnce(largeDeposit)
        .mockResolvedValueOnce(largeConfirmed);
      mockDepositRepository.update.mockResolvedValue(undefined);
      mockDepositRepository.createQueryBuilder.mockReturnValue(
        buildQB('10000'),
      );

      await service.depositToVault(VAULT_ID, {
        userId: USER_ID,
        amount: 10000,
      });

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Large Deposit Alert' }),
      );
    });

    it('should transition vault to FULL_CAPACITY when deposit fills strategy', async () => {
      const vault = buildVault({ totalDeposits: 9500, availableCapacity: 500 });
      const fullVault = buildVault({
        totalDeposits: 10000,
        isFullCapacity: true,
        availableCapacity: 0,
      });
      const smallDeposit = { ...pendingDeposit, amount: 500 };
      const smallConfirmed = { ...confirmedDeposit, amount: 500 };

      mockVaultRepository.findOne.mockResolvedValue(vault);
      mockDepositRepository.create.mockReturnValue(smallDeposit);
      mockManager.save.mockResolvedValue(smallDeposit);
      mockManager.increment.mockResolvedValue(undefined);
      mockManager.findOne.mockResolvedValue(fullVault);
      mockManager.update.mockResolvedValue(undefined);
      mockDepositRepository.findOne
        .mockResolvedValueOnce(smallDeposit)
        .mockResolvedValueOnce(smallConfirmed);
      mockDepositRepository.update.mockResolvedValue(undefined);
      mockDepositRepository.createQueryBuilder.mockReturnValue(
        buildQB('10000'),
      );

      await service.depositToVault(VAULT_ID, { userId: USER_ID, amount: 500 });

      expect(mockManager.update).toHaveBeenCalledWith(
        Vault,
        { id: VAULT_ID },
        { status: VaultStatus.FULL_CAPACITY },
      );
    });

    it('should notify user after deposit confirmed', async () => {
      const vault = buildVault();
      const updatedVault = buildVault({ totalDeposits: 1000 });

      mockVaultRepository.findOne.mockResolvedValue(vault);
      mockDepositRepository.create.mockReturnValue(pendingDeposit);
      mockManager.save.mockResolvedValue(pendingDeposit);
      mockManager.increment.mockResolvedValue(undefined);
      mockManager.findOne.mockResolvedValue(updatedVault);
      mockDepositRepository.findOne
        .mockResolvedValueOnce(pendingDeposit)
        .mockResolvedValueOnce(confirmedDeposit);
      mockDepositRepository.update.mockResolvedValue(undefined);
      mockDepositRepository.createQueryBuilder.mockReturnValue(buildQB('1000'));

      await service.depositToVault(VAULT_ID, { userId: USER_ID, amount: 1000 });

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Deposit Confirmed',
          userId: USER_ID,
        }),
      );
    });

    it('should reject deposit to inactive vault strategy', async () => {
      mockVaultRepository.findOne.mockResolvedValue(
        buildVault({ status: VaultStatus.INACTIVE }),
      );

      await expect(
        service.depositToVault(VAULT_ID, { userId: USER_ID, amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject deposit to frozen vault strategy', async () => {
      mockVaultRepository.findOne.mockResolvedValue(
        buildVault({ status: VaultStatus.FROZEN }),
      );

      await expect(
        service.depositToVault(VAULT_ID, { userId: USER_ID, amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject deposit to vault at full capacity', async () => {
      mockVaultRepository.findOne.mockResolvedValue(
        buildVault({ isFullCapacity: true, status: VaultStatus.FULL_CAPACITY }),
      );

      await expect(
        service.depositToVault(VAULT_ID, { userId: USER_ID, amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject deposit amount exceeding available vault capacity', async () => {
      mockVaultRepository.findOne.mockResolvedValue(
        buildVault({ totalDeposits: 9900, availableCapacity: 100 }),
      );

      await expect(
        service.depositToVault(VAULT_ID, { userId: USER_ID, amount: 200 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject zero deposit amount', async () => {
      await expect(
        service.depositToVault(VAULT_ID, { userId: USER_ID, amount: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject negative deposit amount', async () => {
      await expect(
        service.depositToVault(VAULT_ID, { userId: USER_ID, amount: -50 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when vault strategy does not exist', async () => {
      mockVaultRepository.findOne.mockResolvedValue(null);

      await expect(
        service.depositToVault(VAULT_ID, { userId: USER_ID, amount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── Withdrawal flow ────────────────────────────────────────────────────────

  describe('withdrawFromVault — fund withdrawal flow', () => {
    const pendingWithdrawal = {
      id: WITHDRAWAL_ID,
      userId: USER_ID,
      vaultId: VAULT_ID,
      amount: 500,
      status: WithdrawalStatus.PENDING,
    };

    const confirmedWithdrawal = {
      ...pendingWithdrawal,
      status: WithdrawalStatus.CONFIRMED,
      transactionHash: 'mock_withdraw_tx_123',
      confirmedAt: new Date(),
    };

    const buildQB = (total: string | null) => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total }),
    });

    it('should route funds out of vault and confirm withdrawal atomically', async () => {
      const vault = buildVault({ totalDeposits: 5000 });
      const updatedVault = buildVault({ totalDeposits: 4500 });

      mockVaultRepository.findOne.mockResolvedValue(vault);
      mockDepositRepository.createQueryBuilder.mockReturnValue(buildQB('5000'));
      mockWithdrawalRepository.create.mockReturnValue(pendingWithdrawal);
      mockManager.save.mockResolvedValue(pendingWithdrawal);
      mockManager.decrement.mockResolvedValue(undefined);
      mockManager.findOne.mockResolvedValue(updatedVault);
      mockWithdrawalRepository.update.mockResolvedValue(undefined);
      mockWithdrawalRepository.findOne.mockResolvedValue(confirmedWithdrawal);

      const result = await service.withdrawFromVault(VAULT_ID, USER_ID, 500);

      expect(result.withdrawal.status).toBe(WithdrawalStatus.CONFIRMED);
      expect(result.withdrawal.amount).toBe(500);
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockManager.decrement).toHaveBeenCalledWith(
        Vault,
        { id: VAULT_ID },
        'totalDeposits',
        500,
      );
    });

    it('should emit real-time withdrawal event to strategy subscribers', async () => {
      const vault = buildVault({ totalDeposits: 5000 });
      const updatedVault = buildVault({ totalDeposits: 4500 });

      mockVaultRepository.findOne.mockResolvedValue(vault);
      mockDepositRepository.createQueryBuilder.mockReturnValue(buildQB('5000'));
      mockWithdrawalRepository.create.mockReturnValue(pendingWithdrawal);
      mockManager.save.mockResolvedValue(pendingWithdrawal);
      mockManager.decrement.mockResolvedValue(undefined);
      mockManager.findOne.mockResolvedValue(updatedVault);
      mockWithdrawalRepository.update.mockResolvedValue(undefined);
      mockWithdrawalRepository.findOne.mockResolvedValue(confirmedWithdrawal);

      await service.withdrawFromVault(VAULT_ID, USER_ID, 500);

      expect(mockVaultGateway.emitWithdrawal).toHaveBeenCalledWith(
        expect.objectContaining({
          vaultId: VAULT_ID,
          amount: 500,
          userId: USER_ID,
        }),
      );
    });

    it('should revert vault from FULL_CAPACITY to ACTIVE after withdrawal', async () => {
      const fullVault = buildVault({
        totalDeposits: 10000,
        status: VaultStatus.FULL_CAPACITY,
      });
      const updatedVault = buildVault({
        totalDeposits: 9500,
        status: VaultStatus.FULL_CAPACITY,
      });

      mockVaultRepository.findOne.mockResolvedValue(fullVault);
      mockDepositRepository.createQueryBuilder.mockReturnValue(
        buildQB('10000'),
      );
      mockWithdrawalRepository.create.mockReturnValue(pendingWithdrawal);
      mockManager.save.mockResolvedValue(pendingWithdrawal);
      mockManager.decrement.mockResolvedValue(undefined);
      mockManager.findOne.mockResolvedValue(updatedVault);
      mockManager.update.mockResolvedValue(undefined);
      mockWithdrawalRepository.update.mockResolvedValue(undefined);
      mockWithdrawalRepository.findOne.mockResolvedValue(confirmedWithdrawal);

      await service.withdrawFromVault(VAULT_ID, USER_ID, 500);

      expect(mockManager.update).toHaveBeenCalledWith(
        Vault,
        { id: VAULT_ID },
        { status: VaultStatus.ACTIVE },
      );
    });

    it('should notify user after withdrawal is confirmed', async () => {
      const vault = buildVault({ totalDeposits: 5000 });
      const updatedVault = buildVault({ totalDeposits: 4500 });

      mockVaultRepository.findOne.mockResolvedValue(vault);
      mockDepositRepository.createQueryBuilder.mockReturnValue(buildQB('5000'));
      mockWithdrawalRepository.create.mockReturnValue(pendingWithdrawal);
      mockManager.save.mockResolvedValue(pendingWithdrawal);
      mockManager.decrement.mockResolvedValue(undefined);
      mockManager.findOne.mockResolvedValue(updatedVault);
      mockWithdrawalRepository.update.mockResolvedValue(undefined);
      mockWithdrawalRepository.findOne.mockResolvedValue(confirmedWithdrawal);

      await service.withdrawFromVault(VAULT_ID, USER_ID, 500);

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Withdrawal Confirmed',
          userId: USER_ID,
        }),
      );
    });

    it('should reject withdrawal exceeding user total confirmed deposits', async () => {
      const vault = buildVault({ totalDeposits: 1000 });

      mockVaultRepository.findOne.mockResolvedValue(vault);
      mockDepositRepository.createQueryBuilder.mockReturnValue(buildQB('200'));

      await expect(
        service.withdrawFromVault(VAULT_ID, USER_ID, 500),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject withdrawal when user has no confirmed deposits', async () => {
      const vault = buildVault({ totalDeposits: 1000 });

      mockVaultRepository.findOne.mockResolvedValue(vault);
      mockDepositRepository.createQueryBuilder.mockReturnValue(buildQB(null));

      await expect(
        service.withdrawFromVault(VAULT_ID, USER_ID, 100),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject zero withdrawal amount', async () => {
      await expect(
        service.withdrawFromVault(VAULT_ID, USER_ID, 0),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject negative withdrawal amount', async () => {
      await expect(
        service.withdrawFromVault(VAULT_ID, USER_ID, -100),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when vault strategy does not exist', async () => {
      mockVaultRepository.findOne.mockResolvedValue(null);

      await expect(
        service.withdrawFromVault(VAULT_ID, USER_ID, 100),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── Vault retrieval ────────────────────────────────────────────────────────

  describe('getVaultById — strategy lookup', () => {
    it('should return vault with deposits and owner relations', async () => {
      const vault = buildVault();
      mockVaultRepository.findOne.mockResolvedValue(vault);

      const result = await service.getVaultById(VAULT_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe(VAULT_ID);
      expect(mockVaultRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ relations: ['deposits', 'owner'] }),
      );
    });

    it('should throw NotFoundException for unknown vault', async () => {
      mockVaultRepository.findOne.mockResolvedValue(null);

      await expect(service.getVaultById('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── Balance aggregation ────────────────────────────────────────────────────

  describe('getUserTotalDeposits — yield balance aggregation', () => {
    it('should sum all confirmed deposits for a user across strategy vaults', async () => {
      const mockQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '3500.5' }),
      };
      mockDepositRepository.createQueryBuilder.mockReturnValue(mockQB);

      const total = await service.getUserTotalDeposits(USER_ID);

      expect(total).toBe(3500.5);
      expect(mockQB.andWhere).toHaveBeenCalledWith('deposit.status = :status', {
        status: DepositStatus.CONFIRMED,
      });
    });

    it('should return 0 when user has no confirmed deposits', async () => {
      const mockQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };
      mockDepositRepository.createQueryBuilder.mockReturnValue(mockQB);

      const total = await service.getUserTotalDeposits(USER_ID);

      expect(total).toBe(0);
    });
  });

  // ── Public vault listing ───────────────────────────────────────────────────

  describe('getPublicVaults — available yield strategies', () => {
    it('should return all public vaults ordered by creation date', async () => {
      const vaults = [buildVault({ id: VAULT_ID, isPublic: true })];
      mockVaultRepository.find.mockResolvedValue(vaults);
      mockVaultRepository.count.mockResolvedValue(1);

      const result = await service.getPublicVaults({});

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(mockVaultRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublic: true } }),
      );
    });

    it('should return empty array when no public vaults exist', async () => {
      mockVaultRepository.find.mockResolvedValue([]);
      mockVaultRepository.count.mockResolvedValue(0);

      const result = await service.getPublicVaults({});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ── Vault cloning ──────────────────────────────────────────────────────────

  describe('cloneVaultFromTemplate', () => {
    it('should create a new vault with copied config and reset financial state', async () => {
      const sourceVault = buildVault({
        status: VaultStatus.FULL_CAPACITY,
        totalDeposits: 5000,
      });
      const savedClone = buildVault({
        id: CLONED_VAULT_ID,
        vaultName: 'Harvest Yield Vault (Copy)',
        status: VaultStatus.ACTIVE,
        totalDeposits: 0,
        currentApprovals: 0,
        availableCapacity: 10000,
        utilizationPercentage: 0,
        isFullCapacity: false,
      });

      mockVaultRepository.findOne.mockResolvedValue(sourceVault);
      mockVaultRepository.create.mockImplementation((data) => data);
      mockVaultRepository.save.mockResolvedValue(savedClone);

      const result = await service.cloneVaultFromTemplate(VAULT_ID, USER_ID);

      expect(mockVaultRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: USER_ID,
          type: VaultType.CROP_PRODUCTION,
          status: VaultStatus.ACTIVE,
          vaultName: 'Harvest Yield Vault (Copy)',
          description: 'Template vault',
          symbol: 'HVF',
          assetPair: 'XLM/USDC',
          totalDeposits: 0,
          maxCapacity: 10000,
          interestRate: 5,
          requiresMultiSignature: true,
          approvalThreshold: 2,
          currentApprovals: 0,
        }),
      );
      expect(result.id).toBe(CLONED_VAULT_ID);
      expect(result.totalDeposits).toBe(0);
      expect(result.status).toBe(VaultStatus.ACTIVE);
    });

    it('should use a custom vault name when provided', async () => {
      const sourceVault = buildVault();
      const savedClone = buildVault({
        id: CLONED_VAULT_ID,
        vaultName: 'My Custom Clone',
        totalDeposits: 0,
        currentApprovals: 0,
      });

      mockVaultRepository.findOne.mockResolvedValue(sourceVault);
      mockVaultRepository.create.mockImplementation((data) => data);
      mockVaultRepository.save.mockResolvedValue(savedClone);

      const result = await service.cloneVaultFromTemplate(
        VAULT_ID,
        USER_ID,
        'My Custom Clone',
      );

      expect(mockVaultRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ vaultName: 'My Custom Clone' }),
      );
      expect(result.vaultName).toBe('My Custom Clone');
    });

    it('should throw NotFoundException when source vault does not exist', async () => {
      mockVaultRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cloneVaultFromTemplate(VAULT_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when user is not the owner', async () => {
      mockVaultRepository.findOne.mockResolvedValue(
        buildVault({ ownerId: OTHER_USER_ID }),
      );

      await expect(
        service.cloneVaultFromTemplate(VAULT_ID, USER_ID),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── mapVaultToResponse ─────────────────────────────────────────────────────

  describe('mapVaultToResponse — strategy DTO serialisation', () => {
    it('should map vault entity to response DTO correctly', () => {
      const vault = buildVault({
        totalDeposits: 2000,
        maxCapacity: 10000,
        availableCapacity: 8000,
        utilizationPercentage: 20,
        interestRate: 5.5,
      }) as unknown as Vault;

      const dto = service.mapVaultToResponse(vault);

      expect(dto.id).toBe(VAULT_ID);
      expect(dto.totalDeposits).toBe(2000);
      expect(dto.maxCapacity).toBe(10000);
      expect(dto.interestRate).toBe(5.5);
      expect(dto.ownerId).toBe(USER_ID);
    });
  });
});
