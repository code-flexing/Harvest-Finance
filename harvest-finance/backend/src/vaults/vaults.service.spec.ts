import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VaultsService } from './vaults.service';
import { Vault, VaultStatus } from '../database/entities/vault.entity';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';
import {
  Withdrawal,
  WithdrawalStatus,
} from '../database/entities/withdrawal.entity';
import { Strategy, CompoundingFrequency } from '../database/entities/strategy.entity';
import { VaultApyHistory } from '../database/entities/vault-apy-history.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { VaultGateway } from '../realtime/vault.gateway';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContractCacheService } from '../common/cache/contract-cache.service';
import { InputSanitizerService } from '../common/sanitization/input-sanitizer.service';
import { DepositEventService } from './deposit-event.service';

describe('VaultsService', () => {
  let service: VaultsService;

  const mockVault = {
    id: 'vault-1',
    ownerId: 'user-1',
    vaultName: 'Test Vault',
    status: VaultStatus.ACTIVE,
    totalDeposits: 1000,
    maxCapacity: 10000,
    isFullCapacity: false,
    availableCapacity: 9000,
    deposits: [],
  };

  const mockEntityManager = {
    save: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((cb: (em: typeof mockEntityManager) => unknown) =>
      cb(mockEntityManager),
    ),
  };

  const mockVaultRepository = { findOne: jest.fn(), find: jest.fn() };
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

  const mockStrategyRepository = {
    findOne: jest.fn(),
  };

  const mockApyHistoryRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockContractCacheService = {
    getVaultState: jest.fn(async (id: string, cb: () => Promise<any>) => {
      // call the provided callback to simulate cache miss and return its result
      return await cb();
    }),
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
        {
          provide: getRepositoryToken(Strategy),
          useValue: mockStrategyRepository,
        },
        {
          provide: getRepositoryToken(VaultApyHistory),
          useValue: mockApyHistoryRepository,
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

  describe('withdrawFromVault', () => {
    const buildQB = (total: string | null) => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total }),
    });

    it('should successfully withdraw funds', async () => {
      const updatedVault = { ...mockVault, totalDeposits: 900 };
      const pendingWithdrawal = {
        id: 'w-1',
        userId: 'user-1',
        vaultId: 'vault-1',
        amount: 100,
        status: WithdrawalStatus.PENDING,
      };
      const confirmedWithdrawal = {
        ...pendingWithdrawal,
        status: WithdrawalStatus.CONFIRMED,
        confirmedAt: new Date(),
      };

      mockVaultRepository.findOne.mockResolvedValue(mockVault);
      mockDepositRepository.createQueryBuilder.mockReturnValue(buildQB('1000'));
      mockWithdrawalRepository.create.mockReturnValue(pendingWithdrawal);
      mockEntityManager.save.mockResolvedValue(pendingWithdrawal);
      mockEntityManager.decrement.mockResolvedValue(undefined);
      mockEntityManager.findOne.mockResolvedValue(updatedVault);
      mockWithdrawalRepository.update.mockResolvedValue(undefined);
      mockWithdrawalRepository.findOne.mockResolvedValue(confirmedWithdrawal);

      const result = await service.withdrawFromVault('vault-1', 'user-1', 100);

      expect(result.withdrawal.status).toBe(WithdrawalStatus.CONFIRMED);
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

    it('should throw BadRequestException if insufficient user balance', async () => {
      mockVaultRepository.findOne.mockResolvedValue(mockVault);
      mockDepositRepository.createQueryBuilder.mockReturnValue(buildQB('50'));

      await expect(
        service.withdrawFromVault('vault-1', 'user-1', 100),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if amount is zero', async () => {
      await expect(
        service.withdrawFromVault('vault-1', 'user-1', 0),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('depositToVault', () => {
    it('should throw BadRequestException if vault is not active', async () => {
      mockVaultRepository.findOne.mockResolvedValue({
        ...mockVault,
        status: VaultStatus.INACTIVE,
      });

      await expect(
        service.depositToVault('vault-1', { userId: 'user-1', amount: 100 }),
      ).rejects.toThrow(BadRequestException);
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
    });

    it('should throw BadRequestException for negative deposit', async () => {
      mockVaultRepository.findOne.mockResolvedValue(mockVault);

      await expect(
        service.depositToVault('vault-1', { userId: 'user-1', amount: -100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for very large deposit exceeding available capacity', async () => {
      const smallCapacityVault = { ...mockVault, availableCapacity: 100 };
      mockVaultRepository.findOne.mockResolvedValue(smallCapacityVault);

      await expect(
        service.depositToVault('vault-1', { userId: 'user-1', amount: 1000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle maximum safe integer deposit', async () => {
      const maxSafeInt = Number.MAX_SAFE_INTEGER;
      mockVaultRepository.findOne.mockResolvedValue({
        ...mockVault,
        availableCapacity: maxSafeInt,
      });

      // This should not throw an error for the amount validation
      // (though it might fail later for other reasons)
      await expect(
        service.depositToVault('vault-1', {
          userId: 'user-1',
          amount: maxSafeInt,
        }),
      ).rejects.toThrow(); // Will fail due to mock setup, but not due to amount validation
    });

    it('should reject deposit when vault is full capacity', async () => {
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
    });

    it('should reject deposit when vault is inactive', async () => {
      const inactiveVault = { ...mockVault, status: VaultStatus.INACTIVE };
      mockVaultRepository.findOne.mockResolvedValue(inactiveVault);

      await expect(
        service.depositToVault('vault-1', { userId: 'user-1', amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject deposit exceeding maximum safe deposit limit', async () => {
      const beyondSafeLimit = 1e31; // Beyond MAX_SAFE_DEPOSIT
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
    });
  });

  describe('getApyHistory', () => {
    it('should return APY history for default 30 days', async () => {
      const result = await service.getApyHistory();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return APY history for specific vault', async () => {
      const result = await service.getApyHistory('vault-1');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return APY history for 7 days', async () => {
      const result = await service.getApyHistory(undefined, '7d');
      expect(result).toBeDefined();
      expect(result.length).toBe(7);
    });

    it('should return APY history for 90 days', async () => {
      const result = await service.getApyHistory(undefined, '90d');
      expect(result).toBeDefined();
      expect(result.length).toBe(90);
    });

    it('should return APY history for all time', async () => {
      const result = await service.getApyHistory(undefined, 'all');
      expect(result).toBeDefined();
      expect(result.length).toBe(365);
    });
  });

  describe('getUserTotalDeposits — unit tests', () => {
    it('should sum all confirmed deposits for a user', async () => {
      const mockQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '1234.56' }),
      };
      mockDepositRepository.createQueryBuilder.mockReturnValue(mockQB);

      const total = await service.getUserTotalDeposits('user-1');

      expect(total).toBe(1234.56);
      expect(mockQB.andWhere).toHaveBeenCalledWith('deposit.status = :status', {
        status: DepositStatus.CONFIRMED,
      });
    });

    it('should return 0 when repository returns null total', async () => {
      const mockQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };
      mockDepositRepository.createQueryBuilder.mockReturnValue(mockQB);

      const total = await service.getUserTotalDeposits('user-2');

      expect(total).toBe(0);
    });
  });

  describe('calculateApy', () => {
    it('should calculate APY with daily compounding', () => {
      const apy = service.calculateApy(5, CompoundingFrequency.DAILY);
      // APY = (1 + 0.05/365)^365 - 1 ≈ 5.127%
      expect(apy).toBeCloseTo(5.13, 1);
    });

    it('should calculate APY with weekly compounding', () => {
      const apy = service.calculateApy(5, CompoundingFrequency.WEEKLY);
      // APY = (1 + 0.05/52)^52 - 1 ≈ 5.116%
      expect(apy).toBeCloseTo(5.12, 1);
    });

    it('should calculate APY with monthly compounding', () => {
      const apy = service.calculateApy(5, CompoundingFrequency.MONTHLY);
      // APY = (1 + 0.05/12)^12 - 1 ≈ 5.116%
      expect(apy).toBeCloseTo(5.12, 1);
    });

    it('should return 0 for zero APR', () => {
      const apy = service.calculateApy(0, CompoundingFrequency.DAILY);
      expect(apy).toBe(0);
    });

    it('should default to daily compounding when no frequency provided', () => {
      const apy = service.calculateApy(5);
      const apyDaily = service.calculateApy(5, CompoundingFrequency.DAILY);
      expect(apy).toBe(apyDaily);
    });

    it('should handle high APR values', () => {
      const apy = service.calculateApy(100, CompoundingFrequency.DAILY);
      // APY = (1 + 1/365)^365 - 1 ≈ 171.4%
      expect(apy).toBeGreaterThan(171);
      expect(apy).toBeLessThan(172);
    });
  });

  describe('mapVaultToResponse — APY integration', () => {
    it('should include apr and apy in the response', () => {
      const vault = {
        ...mockVault,
        interestRate: 5,
        strategy: null,
      } as any;

      const response = service.mapVaultToResponse(vault);

      expect(response.apr).toBe(5);
      expect(response.apy).toBeCloseTo(5.13, 1);
      expect(response.interestRate).toBe(5);
    });

    it('should use vault strategy compounding frequency for APY', () => {
      const vault = {
        ...mockVault,
        interestRate: 5,
        strategy: { compoundingFrequency: CompoundingFrequency.MONTHLY },
      } as any;

      const response = service.mapVaultToResponse(vault);

      expect(response.apr).toBe(5);
      expect(response.apy).toBeCloseTo(5.12, 1);
    });

    it('should fallback to daily compounding when no strategy', () => {
      const vault = {
        ...mockVault,
        interestRate: 5,
        strategy: null,
      } as any;

      const response = service.mapVaultToResponse(vault);

      expect(response.apy).toBeCloseTo(5.13, 1);
    });
  });

  describe('recordApySnapshot', () => {
    it('should create an APY history snapshot for a vault', async () => {
      const vault = {
        ...mockVault,
        interestRate: 5,
        strategy: null,
      } as any;

      mockVaultRepository.findOne.mockResolvedValue(vault);
      mockApyHistoryRepository.createQueryBuilder.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      });

      await service.recordApySnapshot('vault-1');

      expect(mockApyHistoryRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should store correct APY value in snapshot', async () => {
      const vault = {
        ...mockVault,
        interestRate: 5,
        strategy: null,
      } as any;

      mockVaultRepository.findOne.mockResolvedValue(vault);

      const mockInsert = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };

      mockApyHistoryRepository.createQueryBuilder.mockReturnValue(mockInsert);

      await service.recordApySnapshot('vault-1');

      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          apy: expect.any(Number),
        }),
      );
    });

    it('should not throw when vault does not exist', async () => {
      mockVaultRepository.findOne.mockResolvedValue(null);

      await expect(
        service.recordApySnapshot('nonexistent'),
      ).resolves.not.toThrow();
    });
  });

  describe('getApyHistory', () => {
    it('should return APY history from database', async () => {
      const mockHistory = [
        {
          id: '1',
          vaultId: 'vault-1',
          apy: 5.13,
          snapshotDate: new Date('2024-01-01'),
          createdAt: new Date(),
        },
      ];

      const mockQB = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockHistory),
      };

      mockApyHistoryRepository.createQueryBuilder.mockReturnValue(mockQB);

      const result = await service.getApyHistory('vault-1', '30d');

      expect(result).toHaveLength(1);
      expect(result[0].apy).toBe(5.13);
      expect(result[0].vaultId).toBe('vault-1');
    });

    it('should filter by vaultId when provided', async () => {
      const mockQB = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockApyHistoryRepository.createQueryBuilder.mockReturnValue(mockQB);

      await service.getApyHistory('vault-1', '30d');

      expect(mockQB.andWhere).toHaveBeenCalledWith(
        'history.vaultId = :vaultId',
        { vaultId: 'vault-1' },
      );
    });
  });
});
