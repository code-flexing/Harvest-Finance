import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InsuranceFundController } from './insurance-fund.controller';
import { InsuranceFundService, InsuranceFundStats } from './insurance-fund.service';
import { Vault, VaultType, VaultStatus } from '../database/entities/vault.entity';
import { InsuranceClaim, InsuranceClaimStatus } from '../database/entities/insurance-claim.entity';
import { User, UserRole } from '../database/entities/user.entity';

const USER_ID = 'user-11111111-1111-1111-1111-111111111111';
const ADMIN_ID = 'admin-22222222-2222-2222-2222-222222222222';
const INSURANCE_VAULT_ID = 'insurance-v-44444444-4444-4444-4444-444444444444';
const CLAIM_ID = 'claim-55555555-5555-5555-5555-555555555555';

describe('InsuranceFundController', () => {
  let controller: InsuranceFundController;
  let service: InsuranceFundService;

  const mockInsuranceFundService = {
    depositToFund: jest.fn(),
    getCoverageRatio: jest.fn(),
    getStats: jest.fn(),
    getInsuranceFundBalance: jest.fn(),
    getEscrowDetails: jest.fn(),
    getAllClaims: jest.fn(),
    getUserClaims: jest.fn(),
    getClaimsByStatus: jest.fn(),
    getClaimById: jest.fn(),
    declareIncident: jest.fn(),
    processIncident: jest.fn(),
    finalizeClaim: jest.fn(),
    getAuditTrail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InsuranceFundController],
      providers: [
        { provide: InsuranceFundService, useValue: mockInsuranceFundService },
      ],
    }).compile();

    controller = module.get<InsuranceFundController>(InsuranceFundController);
    service = module.get<InsuranceFundService>(InsuranceFundService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('depositToFund', () => {
    it('should call service with deposit parameters', async () => {
      const vault = { id: INSURANCE_VAULT_ID, totalDeposits: 1000 } as Vault;
      mockInsuranceFundService.depositToFund.mockResolvedValue(vault);

      const result = await controller.depositToFund({ userId: USER_ID, amount: 100 });

      expect(mockInsuranceFundService.depositToFund).toHaveBeenCalledWith(USER_ID, 100);
      expect(result).toBe(vault);
    });

    it('should throw BadRequestException for missing parameters', async () => {
      await expect(controller.depositToFund({}) as any).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid amount type', async () => {
      await expect(controller.depositToFund({ userId: USER_ID, amount: 'invalid' } as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getCoverage', () => {
    it('should return coverage ratio', async () => {
      mockInsuranceFundService.getCoverageRatio.mockResolvedValue(0.25);

      const result = await controller.getCoverage();

      expect(result).toEqual({ coverageRatio: 0.25 });
      expect(mockInsuranceFundService.getCoverageRatio).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return insurance fund statistics', async () => {
      const stats = {
        fundBalance: 10000,
        totalTVL: 50000,
        coverageRatio: 0.2,
        totalClaimsProcessed: 5,
        totalPayoutsDistributed: 1500,
      } as InsuranceFundStats;
      mockInsuranceFundService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats();

      expect(result).toEqual(stats);
      expect(mockInsuranceFundService.getStats).toHaveBeenCalled();
    });
  });

  describe('getBalance', () => {
    it('should return fund balance', async () => {
      mockInsuranceFundService.getInsuranceFundBalance.mockResolvedValue(15000);

      const result = await controller.getBalance();

      expect(result).toEqual({ fundBalance: 15000 });
    });
  });

  describe('getEscrowDetails', () => {
    it('should return escrow details', async () => {
      const escrow = {
        address: 'insurance-multisig-escrow',
        signers: ['signer-1', 'signer-2', 'signer-3'],
        threshold: 2,
        createdAt: new Date(),
      };
      mockInsuranceFundService.getEscrowDetails.mockResolvedValue(escrow);

      const result = await controller.getEscrowDetails();

      expect(result.address).toBe('insurance-multisig-escrow');
    });
  });

  describe('getAllClaims', () => {
    it('should return all claims', async () => {
      const claims = [
        { id: CLAIM_ID, status: InsuranceClaimStatus.COMPLETED },
      ] as InsuranceClaim[];
      mockInsuranceFundService.getAllClaims.mockResolvedValue(claims);

      const result = await controller.getAllClaims();

      expect(result).toHaveLength(1);
    });
  });

  describe('getUserClaims', () => {
    it('should return claims for specific user', async () => {
      const claims = [{ id: CLAIM_ID }] as InsuranceClaim[];
      mockInsuranceFundService.getUserClaims.mockResolvedValue(claims);

      const result = await controller.getUserClaims(USER_ID);

      expect(mockInsuranceFundService.getUserClaims).toHaveBeenCalledWith(USER_ID);
      expect(result).toHaveLength(1);
    });
  });

  describe('getClaimsByStatus', () => {
    it('should return claims filtered by status', async () => {
      const claims = [
        { id: CLAIM_ID, status: InsuranceClaimStatus.COMPLETED },
      ] as InsuranceClaim[];
      mockInsuranceFundService.getClaimsByStatus.mockResolvedValue(claims);

      const result = await controller.getClaimsByStatus('COMPLETED');

      expect(mockInsuranceFundService.getClaimsByStatus).toHaveBeenCalledWith(InsuranceClaimStatus.COMPLETED);
      expect(result).toHaveLength(1);
    });
  });

  describe('getClaim', () => {
    it('should return a single claim by ID', async () => {
      const claim = { id: CLAIM_ID } as InsuranceClaim;
      mockInsuranceFundService.getClaimById.mockResolvedValue(claim);

      const result = await controller.getClaim(CLAIM_ID);

      expect(mockInsuranceFundService.getClaimById).toHaveBeenCalledWith(CLAIM_ID);
      expect(result.id).toBe(CLAIM_ID);
    });
  });

  describe('declareIncident', () => {
    it('should process incident declaration', async () => {
      const claims = [{ id: CLAIM_ID }] as InsuranceClaim[];
      mockInsuranceFundService.declareIncident.mockResolvedValue(claims);

      const result = await controller.declareIncident(
        {
          vaultId: INSURANCE_VAULT_ID,
          lossAmount: 5000,
          description: 'Smart contract exploit',
          adminId: ADMIN_ID,
          adminRole: UserRole.ADMIN,
        },
      );

      expect(mockInsuranceFundService.declareIncident).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('processPayout', () => {
    it('should process manual payout', async () => {
      const claims = [{ id: CLAIM_ID }] as InsuranceClaim[];
      mockInsuranceFundService.processIncident.mockResolvedValue(claims);

      const result = await controller.processPayout(
        {
          losses: { [USER_ID]: 1000 },
          reason: 'Strategy failure',
          adminId: ADMIN_ID,
          adminRole: UserRole.ADMIN,
        },
      );

      expect(mockInsuranceFundService.processIncident).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('finalizeClaim', () => {
    it('should finalize a claim', async () => {
      const claim = { id: CLAIM_ID, status: InsuranceClaimStatus.COMPLETED } as InsuranceClaim;
      mockInsuranceFundService.finalizeClaim.mockResolvedValue(claim);

      const result = await controller.finalizeClaim(CLAIM_ID, ADMIN_ID, UserRole.ADMIN);

      expect(mockInsuranceFundService.finalizeClaim).toHaveBeenCalledWith(CLAIM_ID, ADMIN_ID, UserRole.ADMIN);
      expect(result.status).toBe(InsuranceClaimStatus.COMPLETED);
    });
  });

  describe('getAuditTrail', () => {
    it('should return audit trail data', async () => {
      const auditTrail = {
        deposits: [],
        claims: [],
      };
      mockInsuranceFundService.getAuditTrail.mockResolvedValue(auditTrail);

      const result = await controller.getAuditTrail();

      expect(result).toEqual(auditTrail);
    });
  });
});