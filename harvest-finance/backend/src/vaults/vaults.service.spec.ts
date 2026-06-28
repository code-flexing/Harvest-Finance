import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { VaultsService } from './vaults.service';
import { Vault, VaultStatus, VaultType } from '../database/entities/vault.entity';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';
import { VaultApyHistory } from '../database/entities/vault-apy-history.entity';
import {
  Withdrawal,
  WithdrawalStatus,
} from '../database/entities/withdrawal.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { VaultGateway } from '../realtime/vault.gateway';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContractCacheService } from '../common/cache/contract-cache.service';
import { InputSanitizerService } from '../common/sanitization/input-sanitizer.service';
import { DepositEventService } from './deposit-event.service';
import { ExternalPaymentEventType } from './dto/external-payment-notification.dto';
import { VaultReservation } from './entities/vault-reservation.entity';

describe('VaultsService', () => {
  let service: VaultsService;

  const mockVault = {
    id: 'vault-1',
    ownerId: 'user-1',
    vaultName: 'Test Vault',
    type: VaultType.CROP_PRODUCTION,
    status: VaultStatus.ACTIVE,
    totalDeposits: 1000,
    maxCapacity: 10000,
    isFullCapacity: false,
    availableCapacity: 9000,
    utilizationPercentage: 10,
    approvalStatus: 'PENDING',
    description: 'Test vault description',
    symbol: 'TEST',
    assetPair: 'XLM/USDC',
    interestRate: 5,
    maturityDate: new Date('2030-01-01'),
    lockPeriodEnd: new Date('2027-01-01'),
    isPublic: true,
    requiresMultiSignature: false,
    approvalThreshold: 1,
    currentApprovals: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    deposits: [],
  };

  const mockEntityManager = {
    save: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    getRepository: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((cb: (em: typeof mockEntityManager) => unknown) =>
      cb(mockEntityManager),
    ),
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
  const mockApyHistoryQB = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  const mockVaultApyHistoryRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockApyHistoryQB),
  };
  const mockDepositRepository = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockWithdrawalRepository = {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const mockReservationQB = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ total: null }),
  };
  const mockReservationRepository = {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((dto) => dto),
    save: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 0 }),
    createQueryBuilder: jest.fn().mockReturnValue(mockReservationQB),
  };
  const mockNotificationsService = {
    create: jest.fn().mockResolvedValue(undefined),
  };
  const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
  const mockVaultGateway = {
    emitDeposit: jest.fn(),
    emitWithdrawal: jest.fn(),
  };
  const mockEventEmitter = { emit: jest.fn() };
  const mockContractCache = {
    getVaultState: jest.fn((_id: string, loader: () => Promise<Vault>) => loader()),
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

  // Helper: build a query builder stub that returns a given total
  const buildQB = (total: string | null) => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ total }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultsService,
        { provide: getRepositoryToken(Vault), useValue: mockVaultRepository },
        {
          provide: getRepositoryToken(VaultApyHistory),
          useValue: mockVaultApyHistoryRepository,
        },
        {
          provide: getRepositoryToken(Deposit),
          useValue: mockDepositRepository,
        },
        {
          provide: getRepositoryToken(Withdrawal),
          useValue: mockWithdrawalRepository,
        },
        {
          provide: getRepositoryToken(VaultReservation),
          useValue: mockReservationRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: CustomLoggerService, useValue: mockLogger },
        { provide: VaultGateway, useValue: mockVaultGateway },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ContractCacheService, useValue: mockContractCache },
        { provide: InputSanitizerService, useValue: mockSanitizer },
        { provide: DepositEventService, useValue: mockDepositEventService },
      ],
    }).compile();

    service = module.get<VaultsService>(VaultsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // getVaultById
  // ---------------------------------------------------------------------------
  describe('getVaultById', () => {
    it('should return vault when found', async () => {
      mockVaultRepository.findOne.mockResolvedValue(mockVault);

      const result = await service.getVaultById('vault-1');

      expect(result).toEqual(mockVault);
      expect(mockContractCache.getVaultState).toHaveBeenCalledWith(
        'vault-1',
        expect.any(Function),
      );
    });

    it('should throw NotFoundException when vault does not exist', async () => {
      mockVaultRepository.findOne.mockResolvedValue(null);

      await expect(service.getVaultById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getVaultById('nonexistent')).rejects.toThrow(
        'Vault not found',
      );
    });

    it('should sanitize the vault ID before lookup', async () => {
      mockVaultRepository.findOne.mockResolvedValue(mockVault);
      mockSanitizer.validateUUID.mockReturnValueOnce('vault-1');

      await service.getVaultById('vault-1');

      expect(mockSanitizer.validateUUID).toHaveBeenCalledWith('vault-1');
    });
  });

  // ---------------------------------------------------------------------------
  // withdrawFromVault
  // ---------------------------------------------------------------------------
  describe('withdrawFromVault', () => {
    it('should successfully withdraw funds', async () => {
      const updatedVault = { ...mockVault, totalDeposits: 900 };
      const pendingWithdrawal = {
        id: 'w-1',
        userId: 'user-1',
        vaultId: 'vault-1',
        amount: 100,
        status: WithdrawalStatus.PENDING,
      };

      mockVaultRepository.findOne.mockResolvedValue(mockVault);
      mockDepositRepository.createQueryBuilder.mockReturnValue(buildQB('1000'));
      mockWithdrawalRepository.create.mockReturnValue(pendingWithdrawal);
      mockEntityManager.save.mockResolvedValue(pendingWithdrawal);
      mockEntityManager.decrement.mockResolvedValue(undefined);
      mockEntityManager.findOne.mockResolvedValue(updatedVault);
      mockWithdrawalRepository.update.mockResolvedValue(undefined);
      mockWithdrawalRepository.findOne.mockResolvedValue(pendingWithdrawal);

      const result = await service.withdrawFromVault('vault-1', 'user-1', 100);

      expect(result.withdrawal).toBeDefined();
      expect(mockEntityManager.decrement).toHaveBeenCalledWith(
        Vault,
        { id: 'vault-1' },
        'totalDeposits',
        100,
      );
    });

    it('should throw NotFoundException if vault not found', async () => {
      mockVaultRepository.findOne.mockResolvedValue(null);

      await expect(
        service.withdrawFromVault('nonexistent', 'user-1', 100),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if amount is zero', async () => {
      await expect(
        service.withdrawFromVault('vault-1', 'user-1', 0),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.withdrawFromVault('vault-1', 'user-1', 0),
      ).rejects.toThrow('Withdrawal amount must be greater than 0');
    });

    it('should throw BadRequestException if amount is negative', async () => {
      await expect(
        service.withdrawFromVault('vault-1', 'user-1', -50),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if vault is FROZEN', async () => {
      mockVaultRepository.findOne.mockResolvedValue({
        ...mockVault,
        status: VaultStatus.FROZEN,
      });

      await expect(
        service.withdrawFromVault('vault-1', 'user-1', 100),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.withdrawFromVault('vault-1', 'user-1', 100),
      ).rejects.toThrow('Vault is frozen. Withdrawals are blocked.');
    });

    it('should throw BadRequestException if insufficient user balance', async () => {
      mockVaultRepository.findOne.mockResolvedValue(mockVault);
      mockDepositRepository.createQueryBuilder.mockReturnValue(buildQB('50'));

      await expect(
        service.withdrawFromVault('vault-1', 'user-1', 100),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.withdrawFromVault('vault-1', 'user-1', 100),
      ).rejects.toThrow('Insufficient balance for withdrawal');
    });

    it('should transition FULL_CAPACITY vault back to ACTIVE after withdrawal', async () => {
      const fullVault = { ...mockVault, status: VaultStatus.FULL_CAPACITY };
      const updatedVault = { ...fullVault, totalDeposits: 900 };

      mockVaultRepository.findOne.mockResolvedValue(fullVault);
      mockDepositRepository.createQueryBuilder.mockReturnValue(buildQB('1000'));
      const pendingWithdrawal = {
        id: 'w-1',
        userId: 'user-1',
        vaultId: 'vault-1',
        amount: 100,
        status: WithdrawalStatus.PENDING,
      };
      mockWithdrawalRepository.create.mockReturnValue(pendingWithdrawal);
      mockEntityManager.save.mockResolvedValue(pendingWithdrawal);
      mockEntityManager.decrement.mockResolvedValue(undefined);
      mockEntityManager.findOne.mockResolvedValue({
        ...updatedVault,
        status: VaultStatus.FULL_CAPACITY,
      });
      mockWithdrawalRepository.findOne.mockResolvedValue(pendingWithdrawal);

      await service.withdrawFromVault('vault-1', 'user-1', 100);

      expect(mockEntityManager.update).toHaveBeenCalledWith(
        Vault,
        { id: 'vault-1' },
        { status: VaultStatus.ACTIVE },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // depositToVault
  // ---------------------------------------------------------------------------
  describe('depositToVault', () => {
    it('should throw BadRequestException if vault is not active', async () => {
      mockVaultRepository.findOne.mockResolvedValue({
        ...mockVault,
        status: VaultStatus.INACTIVE,
      });

      await expect(
        service.depositToVault('vault-1', { userId: 'user-1', amount: 100 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.depositToVault('vault-1', { userId: 'user-1', amount: 100 }),
      ).rejects.toThrow('Vault is not active for deposits');
    });

    it('should throw NotFoundException if vault not found', async () => {
      mockVaultRepository.findOne.mockResolvedValue(null);

      await expect(
        service.depositToVault('vault-1', { userId: 'user-1', amount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for zero deposit', async () => {
      mockVaultRepository.findOne.mockResolvedValue(mockVault);

      await expect(
        service.depositToVault('vault-1', { userId: 'user-1', amount: 0 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.depositToVault('vault-1', { userId: 'user-1', amount: 0 }),
      ).rejects.toThrow('Deposit amount must be greater than 0');
    });

    it('should throw BadRequestException for negative deposit', async () => {
      mockVaultRepository.findOne.mockResolvedValue(mockVault);

      await expect(
        service.depositToVault('vault-1', { userId: 'user-1', amount: -100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for deposit exceeding available capacity', async () => {
      const smallCapacityVault = { ...mockVault, availableCapacity: 100 };
      mockVaultRepository.findOne.mockResolvedValue(smallCapacityVault);

      await expect(
        service.depositToVault('vault-1', { userId: 'user-1', amount: 1000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when vault is at full capacity', async () => {
      const fullVault = {
        ...mockVault,
        isFullCapacity: true,
        status: VaultStatus.FULL_CAPACITY,
        availableCapacity: 0,
      };
      mockVaultRepository.findOne.mockResolvedValue(fullVault);

      await expect(
        service.depositToVault('vault-1', { userId: 'user-1', amount: 100 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.depositToVault('vault-1', { userId: 'user-1', amount: 100 }),
      ).rejects.toThrow('Vault is not active for deposits');
    });

    it('should reject deposit exceeding MAX_SAFE_DEPOSIT limit (1e30)', async () => {
      const beyondSafeLimit = 1e31;
      mockVaultRepository.findOne.mockResolvedValue({
        ...mockVault,
        availableCapacity: beyondSafeLimit,
      });

      await expect(
        service.depositToVault('vault-1', {
          userId: 'user-1',
          amount: beyondSafeLimit,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.depositToVault('vault-1', {
          userId: 'user-1',
          amount: beyondSafeLimit,
        }),
      ).rejects.toThrow('Deposit amount exceeds maximum allowed value');
    });

    it('should return existing deposit for duplicate idempotencyKey', async () => {
      const existingDeposit = {
        id: 'dep-existing',
        userId: 'user-1',
        vaultId: 'vault-1',
        amount: 500,
        status: DepositStatus.CONFIRMED,
        vault: mockVault,
        transactionHash: '0xabc',
        confirmedAt: new Date(),
        createdAt: new Date(),
      };
      mockDepositRepository.findOne.mockResolvedValue(existingDeposit);
      mockDepositRepository.createQueryBuilder.mockReturnValue(buildQB('500'));

      const result = await service.depositToVault('vault-1', {
        userId: 'user-1',
        amount: 500,
        idempotencyKey: 'idem-key-1',
      });

      expect(result.deposit.id).toBe('dep-existing');
      // Should not reach the vault lookup
      expect(mockVaultRepository.findOne).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // applyExternalPaymentNotification
  // ---------------------------------------------------------------------------
  describe('applyExternalPaymentNotification', () => {
    const baseParams = {
      depositId: 'dep-1',
      eventType: ExternalPaymentEventType.PAYMENT_CONFIRMED,
      transactionHash: '0xabc',
      stellarTransactionId: 'stellar-1',
      externalEventId: 'ext-1',
    };

    it('should confirm a pending deposit', async () => {
      const pendingDeposit = {
        id: 'dep-1',
        userId: 'user-1',
        vaultId: 'vault-1',
        amount: 200,
        status: DepositStatus.PENDING,
        idempotencyKey: null,
      };
      const confirmedDeposit = {
        ...pendingDeposit,
        status: DepositStatus.CONFIRMED,
      };

      mockDepositRepository.findOne
        .mockResolvedValueOnce(pendingDeposit) // first lookup
        .mockResolvedValueOnce(confirmedDeposit); // after update
      mockDepositRepository.update.mockResolvedValue(undefined);

      const result = await service.applyExternalPaymentNotification(baseParams);

      expect(result.status).toBe(DepositStatus.CONFIRMED);
      expect(result.duplicate).toBe(false);
      expect(mockDepositRepository.update).toHaveBeenCalledWith('dep-1', expect.objectContaining({
        status: DepositStatus.CONFIRMED,
        transactionHash: '0xabc',
      }));
    });

    it('should return duplicate=true for already-confirmed deposit', async () => {
      const confirmedDeposit = {
        id: 'dep-1',
        userId: 'user-1',
        vaultId: 'vault-1',
        amount: 200,
        status: DepositStatus.CONFIRMED,
        idempotencyKey: null,
      };
      mockDepositRepository.findOne.mockResolvedValue(confirmedDeposit);

      const result = await service.applyExternalPaymentNotification(baseParams);

      expect(result.duplicate).toBe(true);
      expect(result.status).toBe(DepositStatus.CONFIRMED);
      expect(mockDepositRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when deposit does not exist', async () => {
      mockDepositRepository.findOne.mockResolvedValue(null);

      await expect(
        service.applyExternalPaymentNotification(baseParams),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.applyExternalPaymentNotification(baseParams),
      ).rejects.toThrow('Deposit not found');
    });

    it('should mark deposit as FAILED on PAYMENT_FAILED event', async () => {
      const pendingDeposit = {
        id: 'dep-1',
        userId: 'user-1',
        vaultId: 'vault-1',
        amount: 200,
        status: DepositStatus.PENDING,
        idempotencyKey: null,
      };
      const failedDeposit = { ...pendingDeposit, status: DepositStatus.FAILED };

      mockDepositRepository.findOne
        .mockResolvedValueOnce(pendingDeposit)
        .mockResolvedValueOnce(failedDeposit);
      mockDepositRepository.update.mockResolvedValue(undefined);

      const result = await service.applyExternalPaymentNotification({
        ...baseParams,
        eventType: ExternalPaymentEventType.PAYMENT_FAILED,
      });

      expect(result.status).toBe(DepositStatus.FAILED);
      expect(result.duplicate).toBe(false);
    });

    it('should return duplicate=true for already-failed deposit on PAYMENT_FAILED', async () => {
      const failedDeposit = {
        id: 'dep-1',
        userId: 'user-1',
        vaultId: 'vault-1',
        amount: 200,
        status: DepositStatus.FAILED,
        idempotencyKey: null,
      };
      mockDepositRepository.findOne.mockResolvedValue(failedDeposit);

      const result = await service.applyExternalPaymentNotification({
        ...baseParams,
        eventType: ExternalPaymentEventType.PAYMENT_FAILED,
      });

      expect(result.duplicate).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // applyExternalWithdrawalNotification
  // ---------------------------------------------------------------------------
  describe('applyExternalWithdrawalNotification', () => {
    const baseWithdrawalParams = {
      withdrawalId: 'w-1',
      eventType: ExternalPaymentEventType.PAYMENT_CONFIRMED,
      transactionHash: '0xdef',
      stellarTransactionId: 'stellar-w-1',
      externalEventId: 'ext-w-1',
    };

    it('should confirm a pending withdrawal', async () => {
      const pendingWithdrawal = {
        id: 'w-1',
        userId: 'user-1',
        vaultId: 'vault-1',
        amount: 300,
        status: WithdrawalStatus.PENDING,
        vault: mockVault,
        transactionHash: null,
        confirmedAt: null,
      };
      const confirmedWithdrawal = {
        ...pendingWithdrawal,
        status: WithdrawalStatus.CONFIRMED,
        transactionHash: '0xdef',
        confirmedAt: new Date(),
      };

      mockWithdrawalRepository.findOne
        .mockResolvedValueOnce(pendingWithdrawal)
        .mockResolvedValueOnce(confirmedWithdrawal);
      mockWithdrawalRepository.update.mockResolvedValue(undefined);

      const result = await service.applyExternalWithdrawalNotification(
        baseWithdrawalParams,
      );

      expect(result.status).toBe(WithdrawalStatus.CONFIRMED);
      expect(result.duplicate).toBe(false);
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('should return duplicate=true for already-confirmed withdrawal', async () => {
      const confirmedWithdrawal = {
        id: 'w-1',
        userId: 'user-1',
        vaultId: 'vault-1',
        amount: 300,
        status: WithdrawalStatus.CONFIRMED,
        vault: mockVault,
      };
      mockWithdrawalRepository.findOne.mockResolvedValue(confirmedWithdrawal);

      const result = await service.applyExternalWithdrawalNotification(
        baseWithdrawalParams,
      );

      expect(result.duplicate).toBe(true);
      expect(mockWithdrawalRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when withdrawal does not exist', async () => {
      mockWithdrawalRepository.findOne.mockResolvedValue(null);

      await expect(
        service.applyExternalWithdrawalNotification(baseWithdrawalParams),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.applyExternalWithdrawalNotification(baseWithdrawalParams),
      ).rejects.toThrow('Withdrawal not found');
    });

    it('should mark withdrawal as FAILED on PAYMENT_FAILED event', async () => {
      const pendingWithdrawal = {
        id: 'w-1',
        userId: 'user-1',
        vaultId: 'vault-1',
        amount: 300,
        status: WithdrawalStatus.PENDING,
        vault: mockVault,
      };
      const failedWithdrawal = {
        ...pendingWithdrawal,
        status: WithdrawalStatus.FAILED,
      };

      mockWithdrawalRepository.findOne
        .mockResolvedValueOnce(pendingWithdrawal)
        .mockResolvedValueOnce(failedWithdrawal);
      mockWithdrawalRepository.update.mockResolvedValue(undefined);

      const result = await service.applyExternalWithdrawalNotification({
        ...baseWithdrawalParams,
        eventType: ExternalPaymentEventType.PAYMENT_FAILED,
      });

      expect(result.status).toBe(WithdrawalStatus.FAILED);
    });

    it('should return duplicate=true for already-failed withdrawal on PAYMENT_FAILED', async () => {
      const failedWithdrawal = {
        id: 'w-1',
        userId: 'user-1',
        vaultId: 'vault-1',
        amount: 300,
        status: WithdrawalStatus.FAILED,
        vault: mockVault,
      };
      mockWithdrawalRepository.findOne.mockResolvedValue(failedWithdrawal);

      const result = await service.applyExternalWithdrawalNotification({
        ...baseWithdrawalParams,
        eventType: ExternalPaymentEventType.PAYMENT_FAILED,
      });

      expect(result.duplicate).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getUserTotalDeposits
  // ---------------------------------------------------------------------------
  describe('getUserTotalDeposits', () => {
    it('should sum all confirmed deposits for a user', async () => {
      const mockQB = buildQB('1234.56');
      mockDepositRepository.createQueryBuilder.mockReturnValue(mockQB);

      const total = await service.getUserTotalDeposits('user-1');

      expect(total).toBe(1234.56);
      expect(mockQB.andWhere).toHaveBeenCalledWith('deposit.status = :status', {
        status: DepositStatus.CONFIRMED,
      });
    });

    it('should return 0 when repository returns null total', async () => {
      const mockQB = buildQB(null);
      mockDepositRepository.createQueryBuilder.mockReturnValue(mockQB);

      const total = await service.getUserTotalDeposits('user-2');

      expect(total).toBe(0);
    });

    it('should return 0 when repository returns undefined total', async () => {
      const mockQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      };
      mockDepositRepository.createQueryBuilder.mockReturnValue(mockQB);

      const total = await service.getUserTotalDeposits('user-3');

      expect(total).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getUserVaults
  // ---------------------------------------------------------------------------
  describe('getUserVaults', () => {
    it('should return mapped vaults for a user', async () => {
      mockVaultRepository.find.mockResolvedValue([mockVault]);

      const result = await service.getUserVaults('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'vault-1');
      expect(mockVaultRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ownerId: 'user-1' } }),
      );
    });

    it('should return empty array when user has no vaults', async () => {
      mockVaultRepository.find.mockResolvedValue([]);

      const result = await service.getUserVaults('user-no-vaults');

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // cloneVaultFromTemplate
  // ---------------------------------------------------------------------------
  describe('cloneVaultFromTemplate', () => {
    it('should throw NotFoundException if source vault does not exist', async () => {
      mockVaultRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cloneVaultFromTemplate('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.cloneVaultFromTemplate('nonexistent', 'user-1'),
      ).rejects.toThrow('Vault not found');
    });

    it('should throw UnauthorizedException if user is not the vault owner', async () => {
      mockVaultRepository.findOne.mockResolvedValue({
        ...mockVault,
        ownerId: 'other-user',
      });

      await expect(
        service.cloneVaultFromTemplate('vault-1', 'user-1'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.cloneVaultFromTemplate('vault-1', 'user-1'),
      ).rejects.toThrow('Only the vault owner can clone this vault');
    });

    it('should create a clone with default name suffix when no name provided', async () => {
      const sourceVault = { ...mockVault, ownerId: 'user-1' };
      const clonedVault = {
        ...sourceVault,
        id: 'vault-clone-1',
        vaultName: 'Test Vault (Copy)',
        totalDeposits: 0,
        currentApprovals: 0,
        status: VaultStatus.ACTIVE,
      };
      mockVaultRepository.findOne.mockResolvedValue(sourceVault);
      mockVaultRepository.create.mockReturnValue(clonedVault);
      mockVaultRepository.save.mockResolvedValue(clonedVault);

      const result = await service.cloneVaultFromTemplate('vault-1', 'user-1');

      expect(result.vaultName).toBe('Test Vault (Copy)');
      expect(result.id).toBe('vault-clone-1');
    });

    it('should use the provided vaultName when specified', async () => {
      const sourceVault = { ...mockVault, ownerId: 'user-1' };
      const clonedVault = {
        ...sourceVault,
        id: 'vault-clone-2',
        vaultName: 'My Custom Clone',
        totalDeposits: 0,
        currentApprovals: 0,
      };
      mockVaultRepository.findOne.mockResolvedValue(sourceVault);
      mockVaultRepository.create.mockReturnValue(clonedVault);
      mockVaultRepository.save.mockResolvedValue(clonedVault);

      const result = await service.cloneVaultFromTemplate(
        'vault-1',
        'user-1',
        'My Custom Clone',
      );

      expect(result.vaultName).toBe('My Custom Clone');
    });
  });

  // ---------------------------------------------------------------------------
  // getPublicVaults
  // ---------------------------------------------------------------------------
  describe('getPublicVaults', () => {
    it('should return paginated public vaults', async () => {
      mockVaultRepository.find.mockResolvedValue([mockVault]);
      mockVaultRepository.count.mockResolvedValue(1);

      const result = await service.getPublicVaults({ limit: 20, skip: 0 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should set hasMore=true when there are more vaults than the limit', async () => {
      const extraVault = { ...mockVault, id: 'vault-extra' };
      // Return limit+1 vaults to trigger hasMore
      mockVaultRepository.find.mockResolvedValue([mockVault, extraVault]);
      mockVaultRepository.count.mockResolvedValue(5);

      const result = await service.getPublicVaults({ limit: 1, skip: 0 });

      expect(result.hasMore).toBe(true);
      expect(result.data).toHaveLength(1); // popped the extra
    });

    it('should return empty list when no public vaults exist', async () => {
      mockVaultRepository.find.mockResolvedValue([]);
      mockVaultRepository.count.mockResolvedValue(0);

      const result = await service.getPublicVaults({ limit: 20, skip: 0 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getVaultsMetadata
  // ---------------------------------------------------------------------------
  describe('getVaultsMetadata', () => {
    it('should return name, symbol, and assetPair for each public vault', async () => {
      mockVaultRepository.find.mockResolvedValue([
        {
          vaultName: 'Test Vault',
          symbol: 'TEST',
          assetPair: 'XLM/USDC',
        },
      ]);

      const result = await service.getVaultsMetadata();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Test Vault',
        symbol: 'TEST',
        assetPair: 'XLM/USDC',
      });
    });

    it('should return empty array when no public vaults exist', async () => {
      mockVaultRepository.find.mockResolvedValue([]);

      const result = await service.getVaultsMetadata();

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // pauseVault
  // ---------------------------------------------------------------------------
  describe('pauseVault', () => {
    it('should set vault status to FROZEN', async () => {
      const frozenVault = { ...mockVault, status: VaultStatus.FROZEN };
      mockVaultRepository.findOne
        .mockResolvedValueOnce(mockVault) // first getVaultById
        .mockResolvedValueOnce(frozenVault); // after update
      mockVaultRepository.update.mockResolvedValue(undefined);

      const result = await service.pauseVault('vault-1', 'user-1');

      expect(mockVaultRepository.update).toHaveBeenCalledWith('vault-1', {
        status: VaultStatus.FROZEN,
      });
      expect(result.status).toBe(VaultStatus.FROZEN);
    });

    it('should throw UnauthorizedException if user is not the owner', async () => {
      const otherOwnerVault = { ...mockVault, ownerId: 'owner-2' };
      mockVaultRepository.findOne.mockResolvedValue(otherOwnerVault);

      // Stub dataSource.getRepository to return a mock user repo that returns no admin
      mockDataSource.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ role: 'FARMER' }),
      });

      await expect(
        service.pauseVault('vault-1', 'user-1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if vault is already paused', async () => {
      const frozenVault = { ...mockVault, status: VaultStatus.FROZEN };
      mockVaultRepository.findOne.mockResolvedValue(frozenVault);

      await expect(
        service.pauseVault('vault-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.pauseVault('vault-1', 'user-1'),
      ).rejects.toThrow('Vault is already paused');
    });
  });

  // ---------------------------------------------------------------------------
  // resumeVault
  // ---------------------------------------------------------------------------
  describe('resumeVault', () => {
    it('should set vault status back to ACTIVE', async () => {
      const frozenVault = { ...mockVault, status: VaultStatus.FROZEN };
      const activeVault = { ...mockVault, status: VaultStatus.ACTIVE };
      mockVaultRepository.findOne
        .mockResolvedValueOnce(frozenVault)
        .mockResolvedValueOnce(activeVault);
      mockVaultRepository.update.mockResolvedValue(undefined);

      const result = await service.resumeVault('vault-1', 'user-1');

      expect(mockVaultRepository.update).toHaveBeenCalledWith('vault-1', {
        status: VaultStatus.ACTIVE,
      });
      expect(result.status).toBe(VaultStatus.ACTIVE);
    });

    it('should throw BadRequestException if vault is not paused', async () => {
      mockVaultRepository.findOne.mockResolvedValue(mockVault); // ACTIVE

      await expect(
        service.resumeVault('vault-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resumeVault('vault-1', 'user-1'),
      ).rejects.toThrow('Vault is not paused');
    });

    it('should throw UnauthorizedException if user is not the owner', async () => {
      const frozenVault = { ...mockVault, ownerId: 'owner-2', status: VaultStatus.FROZEN };
      mockVaultRepository.findOne.mockResolvedValue(frozenVault);
      mockDataSource.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ role: 'FARMER' }),
      });

      await expect(
        service.resumeVault('vault-1', 'user-1'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ---------------------------------------------------------------------------
  // updateVaultMultiSignatureConfig
  // ---------------------------------------------------------------------------
  describe('updateVaultMultiSignatureConfig', () => {
    it('should update multi-signature config for the vault owner', async () => {
      const updatedVault = { ...mockVault, requiresMultiSignature: true, approvalThreshold: 3 };
      mockVaultRepository.findOne
        .mockResolvedValueOnce(mockVault)
        .mockResolvedValueOnce(updatedVault);
      mockVaultRepository.update.mockResolvedValue(undefined);

      const result = await service.updateVaultMultiSignatureConfig(
        'vault-1',
        'user-1',
        true,
        3,
      );

      expect(mockVaultRepository.update).toHaveBeenCalledWith(
        'vault-1',
        expect.objectContaining({ requiresMultiSignature: true, approvalThreshold: 3 }),
      );
      expect(result.requiresMultiSignature).toBe(true);
    });

    it('should throw UnauthorizedException for non-owner, non-admin', async () => {
      const otherOwnerVault = { ...mockVault, ownerId: 'owner-2' };
      mockVaultRepository.findOne.mockResolvedValue(otherOwnerVault);
      mockDataSource.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ role: 'FARMER' }),
      });

      await expect(
        service.updateVaultMultiSignatureConfig('vault-1', 'user-1', true, 2),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for approval threshold < 1', async () => {
      mockVaultRepository.findOne.mockResolvedValue(mockVault);

      await expect(
        service.updateVaultMultiSignatureConfig('vault-1', 'user-1', true, 0),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateVaultMultiSignatureConfig('vault-1', 'user-1', true, 0),
      ).rejects.toThrow('Approval threshold must be between 1 and 10');
    });

    it('should throw BadRequestException for approval threshold > 10', async () => {
      mockVaultRepository.findOne.mockResolvedValue(mockVault);

      await expect(
        service.updateVaultMultiSignatureConfig('vault-1', 'user-1', true, 11),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // getApyHistory
  // ---------------------------------------------------------------------------
  describe('getApyHistory', () => {
    it('should return APY history for default 30 days', async () => {
      const result = await service.getApyHistory();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(30);
    });

    it('should return APY history for a specific vault', async () => {
      const result = await service.getApyHistory('vault-1');
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('vaultId', 'vault-1');
    });

    it('should return 7 data points for 7d range', async () => {
      const result = await service.getApyHistory(undefined, '7d');
      expect(result).toHaveLength(7);
    });

    it('should return 90 data points for 90d range', async () => {
      const result = await service.getApyHistory(undefined, '90d');
      expect(result).toHaveLength(90);
    });

    it('should return 365 data points for all-time range', async () => {
      const result = await service.getApyHistory(undefined, 'all');
      expect(result).toHaveLength(365);
    });

    it('should return 30 data points for unknown range (default fallback)', async () => {
      const result = await service.getApyHistory(undefined, 'unknown-range');
      expect(result).toHaveLength(30);
    });

    it('each data point should have date, apy, and vaultId fields', async () => {
      const result = await service.getApyHistory('vault-1', '7d');
      for (const point of result) {
        expect(point).toHaveProperty('date');
        expect(point).toHaveProperty('apy');
        expect(point).toHaveProperty('vaultId');
        expect(typeof point.apy).toBe('number');
        expect(point.apy).toBeGreaterThanOrEqual(0);
        expect(point.apy).toBeLessThanOrEqual(15);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getDepositEventHistory / getUserDepositEventHistory / getVaultDepositEventHistory
  // ---------------------------------------------------------------------------
  describe('deposit event history methods', () => {
    it('getDepositEventHistory should return mapped events', async () => {
      const fakeEvent = { id: 'ev-1', depositId: 'dep-1' };
      mockDepositEventService.getDepositHistory.mockResolvedValue([fakeEvent]);
      mockDepositEventService.mapEventToResponse.mockReturnValue(fakeEvent);

      const result = await service.getDepositEventHistory('dep-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(fakeEvent);
    });

    it('getUserDepositEventHistory should return events for a user', async () => {
      const fakeEvent = { id: 'ev-2', depositId: 'dep-2' };
      mockDepositEventService.getUserDepositHistory.mockResolvedValue([fakeEvent]);
      mockDepositEventService.mapEventToResponse.mockReturnValue(fakeEvent);

      const result = await service.getUserDepositEventHistory('user-1');

      expect(result).toHaveLength(1);
      expect(mockDepositEventService.getUserDepositHistory).toHaveBeenCalledWith(
        'user-1',
        undefined,
      );
    });

    it('getUserDepositEventHistory should pass vaultId filter when provided', async () => {
      mockDepositEventService.getUserDepositHistory.mockResolvedValue([]);

      await service.getUserDepositEventHistory('user-1', 'vault-1');

      expect(mockDepositEventService.getUserDepositHistory).toHaveBeenCalledWith(
        'user-1',
        'vault-1',
      );
    });

    it('getVaultDepositEventHistory should return events for a vault', async () => {
      const fakeEvent = { id: 'ev-3', vaultId: 'vault-1' };
      mockDepositEventService.getVaultDepositHistory.mockResolvedValue([fakeEvent]);
      mockDepositEventService.mapEventToResponse.mockReturnValue(fakeEvent);

      const result = await service.getVaultDepositEventHistory('vault-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('calculateApy', () => {
    it('should correctly calculate APY with daily compounding', () => {
      expect(service.calculateApy(5, 'daily')).toBe(5.13);
    });

    it('should correctly calculate APY with weekly compounding', () => {
      expect(service.calculateApy(5, 'weekly')).toBe(5.12);
    });

    it('should correctly calculate APY with monthly compounding', () => {
      expect(service.calculateApy(5, 'monthly')).toBe(5.12);
    });
  });

  describe('recordDailyApySnapshots', () => {
    it('should record APY history for active vaults when not already recorded', async () => {
      const activeVaults = [
        { id: 'vault-active-1', interestRate: 5, compoundingFrequency: 'daily', status: VaultStatus.ACTIVE },
      ];
      mockVaultRepository.find.mockResolvedValue(activeVaults);
      mockVaultApyHistoryRepository.findOne.mockResolvedValue(null);
      mockVaultApyHistoryRepository.create.mockReturnValue({ id: 'history-1' });
      mockVaultApyHistoryRepository.save.mockResolvedValue({});

      await service.recordDailyApySnapshots();

      expect(mockVaultRepository.find).toHaveBeenCalledWith({
        where: { status: VaultStatus.ACTIVE },
      });
      expect(mockVaultApyHistoryRepository.findOne).toHaveBeenCalled();
      expect(mockVaultApyHistoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vaultId: 'vault-active-1',
          apy: 5.13,
        }),
      );
      expect(mockVaultApyHistoryRepository.save).toHaveBeenCalled();
    });

    it('should skip recording APY history if snapshot already exists for today', async () => {
      const activeVaults = [
        { id: 'vault-active-1', interestRate: 5, compoundingFrequency: 'daily', status: VaultStatus.ACTIVE },
      ];
      mockVaultRepository.find.mockResolvedValue(activeVaults);
      mockVaultApyHistoryRepository.findOne.mockResolvedValue({ id: 'existing-snapshot-1' });
      mockVaultApyHistoryRepository.create.mockClear();
      mockVaultApyHistoryRepository.save.mockClear();

      await service.recordDailyApySnapshots();

      expect(mockVaultApyHistoryRepository.create).not.toHaveBeenCalled();
      expect(mockVaultApyHistoryRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getApyHistory database query', () => {
    it('should return records from the database if they exist', async () => {
      const dbRecords = [
        { id: 'h-1', vaultId: 'vault-1', date: '2026-06-25', apy: 5.13 },
        { id: 'h-2', vaultId: 'vault-1', date: '2026-06-26', apy: 5.14 },
      ];
      mockApyHistoryQB.getMany.mockResolvedValue(dbRecords);

      const result = await service.getApyHistory('vault-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        vaultId: 'vault-1',
        date: '2026-06-25',
        apy: 5.13,
      });
      expect(result[1]).toEqual({
        vaultId: 'vault-1',
        date: '2026-06-26',
        apy: 5.14,
      });

      mockApyHistoryQB.getMany.mockResolvedValue([]);
    });
  });

  // ---------------------------------------------------------------------------
  // vault capacity reservations
  // ---------------------------------------------------------------------------
  describe('vault capacity reservations', () => {
    const futureExpiry = new Date(Date.now() + 86400000).toISOString();

    beforeEach(() => {
      mockDataSource.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      });
      mockReservationQB.getRawOne.mockResolvedValue({ total: null });
    });

    describe('createReservation', () => {
      it('should create a reservation for the vault owner', async () => {
        mockVaultRepository.findOne.mockResolvedValue(mockVault);
        const savedReservation = {
          id: 'res-1',
          vaultId: 'vault-1',
          walletAddress: 'GBXXX',
          reservedAmount: 2000,
          expiresAt: new Date(futureExpiry),
          isActive: true,
          createdAt: new Date(),
        };
        mockReservationRepository.save.mockResolvedValue(savedReservation);

        const result = await service.createReservation('vault-1', 'user-1', {
          walletAddress: 'GBXXX',
          reservedAmount: 2000,
          expiresAt: futureExpiry,
        });

        expect(result.walletAddress).toBe('GBXXX');
        expect(result.reservedAmount).toBe(2000);
        expect(mockReservationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            vaultId: 'vault-1',
            walletAddress: 'GBXXX',
            reservedAmount: 2000,
            isActive: true,
          }),
        );
      });

      it('should reject non-owner reservation creation', async () => {
        mockVaultRepository.findOne.mockResolvedValue(mockVault);

        await expect(
          service.createReservation('vault-1', 'other-user', {
            walletAddress: 'GBXXX',
            reservedAmount: 1000,
            expiresAt: futureExpiry,
          }),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should reject reservation exceeding public capacity', async () => {
        mockVaultRepository.findOne.mockResolvedValue(mockVault);
        mockReservationQB.getRawOne.mockResolvedValue({ total: '8000' });

        await expect(
          service.createReservation('vault-1', 'user-1', {
            walletAddress: 'GBXXX',
            reservedAmount: 2000,
            expiresAt: futureExpiry,
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('depositToVault with reservations', () => {
      it('should limit reserved depositor to their allocation', async () => {
        mockVaultRepository.findOne.mockResolvedValue(mockVault);
        mockDataSource.getRepository.mockReturnValue({
          findOne: jest.fn().mockResolvedValue({ stellarAddress: 'GBRESERVED' }),
        });
        mockReservationRepository.findOne.mockResolvedValue({
          reservedAmount: 500,
        });

        await expect(
          service.depositToVault('vault-1', { userId: 'user-1', amount: 600 }),
        ).rejects.toThrow('Deposit amount exceeds your reserved allocation');
      });

      it('should exclude reserved capacity for public depositors', async () => {
        mockVaultRepository.findOne.mockResolvedValue(mockVault);
        mockReservationQB.getRawOne.mockResolvedValue({ total: '8000' });

        await expect(
          service.depositToVault('vault-1', { userId: 'user-1', amount: 1500 }),
        ).rejects.toThrow('Deposit amount exceeds available public vault capacity');
      });
    });

    describe('expireReservations', () => {
      it('should deactivate expired reservations', async () => {
        mockReservationRepository.update.mockResolvedValue({ affected: 3 });

        await service.expireReservations();

        expect(mockReservationRepository.update).toHaveBeenCalledWith(
          expect.objectContaining({ isActive: true }),
          { isActive: false },
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Expired 3 vault reservation(s)',
          'VaultsService',
        );
      });
    });

    describe('getPublicVaults', () => {
      it('should subtract active reservations from public availableCapacity', async () => {
        mockVaultRepository.find.mockResolvedValue([mockVault]);
        mockVaultRepository.count.mockResolvedValue(1);
        mockReservationQB.getRawOne.mockResolvedValue({ total: '3000' });

        const result = await service.getPublicVaults({ limit: 20, skip: 0 });

        expect(result.data[0].availableCapacity).toBe(6000);
      });
    });
  });
});
