import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InsuranceFundService } from './insurance-fund.service';
import { Vault, VaultType, VaultStatus } from '../database/entities/vault.entity';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';
import { InsuranceClaim, InsuranceClaimStatus } from '../database/entities/insurance-claim.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { CustomLoggerService } from '../logger/custom-logger.service';

const USER_ID = 'user-11111111-1111-1111-1111-111111111111';
const ADMIN_ID = 'admin-22222222-2222-2222-2222-222222222222';
const VAULT_ID = 'vault-33333333-3333-3333-3333-333333333333';
const INSURANCE_VAULT_ID = 'insurance-v-44444444-4444-4444-4444-444444444444';
const CLAIM_ID = 'claim-55555555-5555-5555-5555-555555555555';

const createMockVault = (overrides: Partial<Vault> = {}): Vault =>
  ({
    id: INSURANCE_VAULT_ID,
    ownerId: 'insurance-multisig-escrow',
    type: VaultType.INSURANCE_FUND,
    status: VaultStatus.ACTIVE,
    vaultName: 'Insurance Fund',
    description: 'Dedicated fund for protection',
    symbol: 'INS',
    assetPair: 'XLM/USDC',
    totalDeposits: 10000,
    maxCapacity: Number.MAX_SAFE_INTEGER,
    interestRate: 0,
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Vault;

const createMockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: USER_ID,
    email: 'test@example.com',
    password: 'hashed',
    role: UserRole.FARMER,
    isActive: true,
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  }) as User;

const createMockDeposit = (overrides: Partial<Deposit> = {}): Deposit =>
  ({
    id: 'deposit-66666666-6666-6666-6666-666666666666',
    userId: USER_ID,
    vaultId: VAULT_ID,
    amount: 1000,
    status: DepositStatus.CONFIRMED,
    transactionHash: 'tx-123',
    stellarTransactionId: null,
    confirmedAt: new Date(),
    notes: null,
    idempotencyKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Deposit;

const createMockClaim = (overrides: Partial<InsuranceClaim> = {}): InsuranceClaim =>
  ({
    id: CLAIM_ID,
    vaultId: INSURANCE_VAULT_ID,
    depositorId: USER_ID,
    lossAmount: 1000,
    payoutAmount: 1000,
    status: InsuranceClaimStatus.PENDING,
    transactionHash: null,
    reason: 'Test incident',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as InsuranceClaim;

describe('InsuranceFundService', () => {
  let service: InsuranceFundService;

  const mockEntityManager = {
    save: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((cb: (em: typeof mockEntityManager) => Promise<unknown>) => cb(mockEntityManager)),
  };

  const mockVaultRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOneOrFail: jest.fn(),
  };

  const mockDepositRepository = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockClaimRepository = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsuranceFundService,
        { provide: getRepositoryToken(Vault), useValue: mockVaultRepository },
        { provide: getRepositoryToken(Deposit), useValue: mockDepositRepository },
        { provide: getRepositoryToken(InsuranceClaim), useValue: mockClaimRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: CustomLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<InsuranceFundService>(InsuranceFundService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getOrCreateInsuranceVault', () => {
    it('should return existing insurance vault if present', async () => {
      const existingVault = createMockVault();
      mockVaultRepository.findOne.mockResolvedValue(existingVault);

      const result = await service.getOrCreateInsuranceVault();

      expect(result.id).toBe(INSURANCE_VAULT_ID);
      expect(mockVaultRepository.save).not.toHaveBeenCalled();
    });

    it('should create insurance vault if not present', async () => {
      mockVaultRepository.findOne.mockResolvedValue(null);
      mockVaultRepository.create.mockReturnValue(createMockVault());
      mockVaultRepository.save.mockResolvedValue(createMockVault());
      mockVaultRepository.findOneOrFail.mockResolvedValue(createMockVault());

      const result = await service.getOrCreateInsuranceVault();

      expect(mockVaultRepository.save).toHaveBeenCalled();
      expect(result.type).toBe(VaultType.INSURANCE_FUND);
    });
  });

  describe('depositToFund', () => {
    it('should deposit funds into insurance fund successfully', async () => {
      const user = createMockUser();
      const insuranceVault = createMockVault({ totalDeposits: 10000 });
      const updatedVault = createMockVault({ totalDeposits: 11000 });

      mockUserRepository.findOne.mockResolvedValue(user);
      mockVaultRepository.findOne.mockResolvedValue(insuranceVault);
      mockVaultRepository.findOneOrFail.mockResolvedValue(updatedVault);
      mockDepositRepository.create.mockReturnValue({
        userId: USER_ID,
        vaultId: INSURANCE_VAULT_ID,
        amount: 1000,
        status: DepositStatus.CONFIRMED,
      });
      mockEntityManager.save.mockResolvedValue(undefined);
      mockEntityManager.increment.mockResolvedValue(undefined);

      const result = await service.depositToFund(USER_ID, 1000);

      expect(result.totalDeposits).toBe(11000);
      expect(mockEntityManager.save).toHaveBeenCalled();
      expect(mockEntityManager.increment).toHaveBeenCalledWith(
        Vault,
        { id: INSURANCE_VAULT_ID },
        'totalDeposits',
        1000,
      );
    });

    it('should throw BadRequestException for non-positive amount', async () => {
      await expect(service.depositToFund(USER_ID, 0)).rejects.toThrow(BadRequestException);
      await expect(service.depositToFund(USER_ID, -100)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for inactive user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.depositToFund(USER_ID, 1000)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCoverageRatio', () => {
    it('should return 0 when there is no TVL', async () => {
      const insuranceVault = createMockVault({ totalDeposits: 5000 });
      mockVaultRepository.findOne.mockResolvedValue(insuranceVault);
      mockVaultRepository.find.mockResolvedValue([]);

      const ratio = await service.getCoverageRatio();

      expect(ratio).toBe(0);
    });

    it('should calculate coverage ratio correctly', async () => {
      const insuranceVault = createMockVault({ totalDeposits: 5000 });
      const activeVaults = [
        { ...createMockVault({ id: VAULT_ID, totalDeposits: 10000 }) },
        { ...createMockVault({ id: 'vault-2', totalDeposits: 15000 }) },
      ];

      mockVaultRepository.findOne.mockResolvedValue(insuranceVault);
      mockVaultRepository.find.mockResolvedValue(activeVaults);

      const ratio = await service.getCoverageRatio();

      expect(ratio).toBe(5000 / 25000);
    });
  });

  describe('getStats', () => {
    it('should return comprehensive insurance fund statistics', async () => {
      const insuranceVault = createMockVault({ totalDeposits: 10000 });
      const activeVaults = [{ ...createMockVault({ id: VAULT_ID, totalDeposits: 20000 }) }];
      const completedClaims = [
        createMockClaim({ payoutAmount: 500 }),
        createMockClaim({ payoutAmount: 300 }),
      ];

      mockVaultRepository.findOne.mockResolvedValue(insuranceVault);
      mockVaultRepository.find.mockResolvedValue(activeVaults);
      mockClaimRepository.find.mockResolvedValue(completedClaims);

      const stats = await service.getStats();

      expect(stats.fundBalance).toBe(10000);
      expect(stats.totalTVL).toBe(20000);
      expect(stats.coverageRatio).toBe(0.5);
      expect(stats.totalClaimsProcessed).toBe(2);
      expect(stats.totalPayoutsDistributed).toBe(800);
    });
  });

  describe('processIncident', () => {
    it('should process incident and create claims for valid losses', async () => {
      const insuranceVault = createMockVault({ totalDeposits: 10000 });
      const user = createMockUser();
      const claim = createMockClaim();

      mockVaultRepository.findOne.mockResolvedValue(insuranceVault);
      mockUserRepository.find.mockResolvedValue([user]);
      mockEntityManager.create.mockReturnValue(claim);
      mockEntityManager.save.mockResolvedValue(claim);
      mockEntityManager.decrement.mockResolvedValue(undefined);
      mockClaimRepository.update.mockResolvedValue(undefined);

      const losses = { [USER_ID]: 5000 };
      const claims = await service.processIncident(ADMIN_ID, UserRole.ADMIN, losses);

      expect(claims.length).toBe(1);
      expect(mockEntityManager.decrement).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-admin', async () => {
      const insuranceVault = createMockVault();
      mockVaultRepository.findOne.mockResolvedValue(insuranceVault);

      await expect(service.processIncident(USER_ID, UserRole.FARMER, {})).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for empty losses', async () => {
      const insuranceVault = createMockVault();
      mockVaultRepository.findOne.mockResolvedValue(insuranceVault);

      await expect(service.processIncident(ADMIN_ID, UserRole.ADMIN, {})).rejects.toThrow(BadRequestException);
    });

    it('should calculate pro-rata payouts when insufficient funds', async () => {
      const insuranceVault = createMockVault({ totalDeposits: 5000 });
      const user1 = createMockUser();
      const user2 = createMockUser({ id: 'user-77777777-7777-7777-7777-777777777777' });

      mockVaultRepository.findOne.mockResolvedValue(insuranceVault);
      mockUserRepository.find.mockResolvedValue([user1, user2]);
      mockEntityManager.findOne.mockResolvedValue(null);
      mockEntityManager.create.mockReturnValue(createMockClaim());
      mockEntityManager.save.mockImplementation((entity) => Promise.resolve(entity));
      mockEntityManager.decrement.mockResolvedValue(undefined);
      mockClaimRepository.update.mockResolvedValue(undefined);

      const losses = { [user1.id]: 3000, [user2.id]: 5000 };
      const claims = await service.processIncident(ADMIN_ID, UserRole.ADMIN, losses);

      expect(claims.length).toBe(2);
    });

    it('should prevent duplicate claims', async () => {
      const insuranceVault = createMockVault({ totalDeposits: 10000 });
      const user = createMockUser();
      const existingClaim = createMockClaim();

      mockVaultRepository.findOne.mockResolvedValue(insuranceVault);
      mockUserRepository.find.mockResolvedValue([user]);
      mockEntityManager.findOne.mockResolvedValue(existingClaim);

      await expect(
        service.processIncident(ADMIN_ID, UserRole.ADMIN, { [USER_ID]: 5000 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('declareIncident', () => {
    it('should calculate losses from vault deposits and process incident', async () => {
      const insuranceVault = createMockVault({ totalDeposits: 20000 });
      const targetVault = { id: VAULT_ID, totalDeposits: 10000 };
      const deposits = [
        { userId: USER_ID, amount: 6000, status: DepositStatus.CONFIRMED },
        { userId: 'user-77777777-7777-7777-7777-777777777777', amount: 4000, status: DepositStatus.CONFIRMED },
      ];
      const user = createMockUser();
      const claim = createMockClaim();

      mockVaultRepository.findOne
        .mockResolvedValueOnce(insuranceVault)
        .mockResolvedValueOnce(targetVault);
      mockDepositRepository.find.mockResolvedValue(deposits);
      mockUserRepository.find.mockResolvedValue([user]);
      mockEntityManager.findOne.mockResolvedValue(null);
      mockEntityManager.create.mockReturnValue(claim);
      mockEntityManager.save.mockImplementation((entity) => Promise.resolve(entity));
      mockEntityManager.decrement.mockResolvedValue(undefined);
      mockClaimRepository.update.mockResolvedValue(undefined);

      const claims = await service.declareIncident(ADMIN_ID, UserRole.ADMIN, {
        vaultId: VAULT_ID,
        lossAmount: 1000,
        description: 'Test incident',
      });

      expect(claims.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundException for non-existent vault', async () => {
      const insuranceVault = createMockVault();
      mockVaultRepository.findOne.mockResolvedValue(insuranceVault);
      mockVaultRepository.findOne.mockResolvedValue(null);

      await expect(
        service.declareIncident(ADMIN_ID, UserRole.ADMIN, {
          vaultId: 'nonexistent',
          lossAmount: 1000,
          description: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for no deposits in vault', async () => {
      const insuranceVault = createMockVault();
      const targetVault = { id: VAULT_ID };
      mockVaultRepository.findOne
        .mockResolvedValueOnce(insuranceVault)
        .mockResolvedValueOnce(targetVault);
      mockDepositRepository.find.mockResolvedValue([]);

      await expect(
        service.declareIncident(ADMIN_ID, UserRole.ADMIN, {
          vaultId: VAULT_ID,
          lossAmount: 1000,
          description: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(
        service.declareIncident(USER_ID, UserRole.FARMER, {
          vaultId: VAULT_ID,
          lossAmount: 1000,
          description: 'Test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserClaims', () => {
    it('should return claims for user', async () => {
      const claims = [createMockClaim()];
      mockClaimRepository.find.mockResolvedValue(claims);

      const result = await service.getUserClaims(USER_ID);

      expect(result).toHaveLength(1);
      expect(mockClaimRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { depositorId: USER_ID } }),
      );
    });
  });

  describe('getClaimsByStatus', () => {
    it('should return claims filtered by status', async () => {
      const claims = [createMockClaim({ status: InsuranceClaimStatus.COMPLETED })];
      mockClaimRepository.find.mockResolvedValue(claims);

      const result = await service.getClaimsByStatus(InsuranceClaimStatus.COMPLETED);

      expect(result).toHaveLength(1);
    });
  });

  describe('getAllClaims', () => {
    it('should return all claims with relations', async () => {
      const claims = [createMockClaim()];
      mockClaimRepository.find.mockResolvedValue(claims);

      const result = await service.getAllClaims();

      expect(result).toHaveLength(1);
      expect(mockClaimRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ relations: ['depositor', 'vault'] }),
      );
    });
  });

  describe('getClaimById', () => {
    it('should return a claim by ID', async () => {
      mockClaimRepository.findOne.mockResolvedValue(createMockClaim());

      const result = await service.getClaimById(CLAIM_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe(CLAIM_ID);
    });

    it('should throw NotFoundException for unknown claim', async () => {
      mockClaimRepository.findOne.mockResolvedValue(null);

      await expect(service.getClaimById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('finalizeClaim', () => {
    it('should finalize a pending claim', async () => {
      const pendingClaim = createMockClaim({ status: InsuranceClaimStatus.PENDING });
      const finalizedClaim = createMockClaim({ status: InsuranceClaimStatus.COMPLETED, transactionHash: 'final-tx' });

      mockClaimRepository.findOne.mockResolvedValue(pendingClaim);
      mockEntityManager.save.mockResolvedValue(finalizedClaim);

      const result = await service.finalizeClaim(CLAIM_ID, ADMIN_ID, UserRole.ADMIN);

      expect(result.status).toBe(InsuranceClaimStatus.COMPLETED);
    });

    it('should throw ForbiddenException for non-admin', async () => {
      mockClaimRepository.findOne.mockResolvedValue(createMockClaim());

      await expect(service.finalizeClaim(CLAIM_ID, USER_ID, UserRole.FARMER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return already completed claim without changes', async () => {
      const completedClaim = createMockClaim({ status: InsuranceClaimStatus.COMPLETED });
      mockClaimRepository.findOne.mockResolvedValue(completedClaim);

      const result = await service.finalizeClaim(CLAIM_ID, ADMIN_ID, UserRole.ADMIN);

      expect(result.status).toBe(InsuranceClaimStatus.COMPLETED);
    });
  });

  describe('getAuditTrail', () => {
    it('should return deposits and claims for audit', async () => {
      const insuranceVault = createMockVault();
      const deposits = [createMockDeposit()];
      const claims = [createMockClaim()];

      mockVaultRepository.findOne.mockResolvedValue(insuranceVault);
      mockDepositRepository.find.mockResolvedValue(deposits);
      mockClaimRepository.find.mockResolvedValue(claims);

      const result = await service.getAuditTrail();

      expect(result.deposits).toHaveLength(1);
      expect(result.claims).toHaveLength(1);
    });
  });

  describe('getEscrowDetails', () => {
    it('should return Soroban multisig escrow details', async () => {
      const escrow = await service.getEscrowDetails();

      expect(escrow.address).toBe('insurance-multisig-escrow');
      expect(escrow.signers).toHaveLength(3);
      expect(escrow.threshold).toBe(2);
    });
  });
});