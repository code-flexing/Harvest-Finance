import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoringService, ScoreBreakdown } from './scoring.service';
import { Vault } from '../database/entities/vault.entity';
import { VaultApyHistory } from '../database/entities/vault-apy-history.entity';
import { VaultScoreHistory } from '../database/entities/vault-score-history.entity';
import { Deposit } from '../database/entities/deposit.entity';

describe('ScoringService', () => {
  let service: ScoringService;
  let vaultRepo: Repository<Vault>;
  let apyHistoryRepo: Repository<VaultApyHistory>;
  let scoreHistoryRepo: Repository<VaultScoreHistory>;

  const mockVault: any = {
    id: 'test-vault-id',
    ownerId: 'owner-id',
    type: 'CROP_PRODUCTION',
    status: 'ACTIVE',
    vaultName: 'Test Vault',
    description: null,
    symbol: 'HVF',
    assetPair: 'XLM/USDC',
    totalDeposits: 50000,
    maxCapacity: 100000,
    interestRate: 10,
    maturityDate: null,
    lockPeriodEnd: null,
    isPublic: true,
    requiresMultiSignature: false,
    approvalThreshold: 1,
    currentApprovals: 0,
    strategyScore: 0,
    strategyId: null,
    strategy: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    owner: null,
    deposits: [],
    approvals: [],
  };

  const mockApyHistory: VaultApyHistory[] = [
    { id: '1', vaultId: 'test-vault-id', apy: 0.08, snapshotDate: new Date('2024-01-01'), createdAt: new Date() } as VaultApyHistory,
    { id: '2', vaultId: 'test-vault-id', apy: 0.09, snapshotDate: new Date('2024-01-02'), createdAt: new Date() } as VaultApyHistory,
    { id: '3', vaultId: 'test-vault-id', apy: 0.10, snapshotDate: new Date('2024-01-03'), createdAt: new Date() } as VaultApyHistory,
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringService,
        {
          provide: getRepositoryToken(Vault),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VaultApyHistory),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VaultScoreHistory),
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Deposit),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ScoringService>(ScoringService);
    vaultRepo = module.get<Repository<Vault>>(getRepositoryToken(Vault));
    apyHistoryRepo = module.get<Repository<VaultApyHistory>>(getRepositoryToken(VaultApyHistory));
    scoreHistoryRepo = module.get<Repository<VaultScoreHistory>>(getRepositoryToken(VaultScoreHistory));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateApyScore', () => {
    it('should return 0 for APY <= 0', () => {
      expect(service.calculateApyScore(0)).toBe(0);
      expect(service.calculateApyScore(-5)).toBe(0);
    });

    it('should return 100 for APY >= 20%', () => {
      expect(service.calculateApyScore(20)).toBe(100);
      expect(service.calculateApyScore(25)).toBe(100);
    });

    it('should return 75 for APY >= 10% and < 20%', () => {
      expect(service.calculateApyScore(10)).toBe(75);
      expect(service.calculateApyScore(15)).toBe(75);
    });

    it('should return 50 for APY >= 5% and < 10%', () => {
      expect(service.calculateApyScore(5)).toBe(50);
      expect(service.calculateApyScore(7.5)).toBe(50);
    });

    it('should return 25 for APY >= 0% and < 5%', () => {
      expect(service.calculateApyScore(1)).toBe(25);
      expect(service.calculateApyScore(3)).toBe(25);
    });
  });

  describe('calculateTvlStabilityScore', () => {
    it('should return 50 for insufficient data (less than 2 history entries)', async () => {
      jest.spyOn(apyHistoryRepo, 'find').mockResolvedValue([mockApyHistory[0]]);
      
      const score = await service.calculateTvlStabilityScore('test-vault-id');
      expect(score).toBe(50);
    });

    it('should return 100 for very stable TVL (low coefficient of variation)', async () => {
      const stableHistory = [
        { ...mockApyHistory[0], apy: 0.1 },
        { ...mockApyHistory[1], apy: 0.101 },
        { ...mockApyHistory[2], apy: 0.102 },
      ];
      jest.spyOn(apyHistoryRepo, 'find').mockResolvedValue(stableHistory);
      
      const score = await service.calculateTvlStabilityScore('test-vault-id');
      expect(score).toBe(100);
    });

    it('should return 75 for stable TVL (moderate coefficient of variation)', async () => {
      const stableHistory = [
        { ...mockApyHistory[0], apy: 0.08 },
        { ...mockApyHistory[1], apy: 0.10 },
        { ...mockApyHistory[2], apy: 0.12 },
      ];
      jest.spyOn(apyHistoryRepo, 'find').mockResolvedValue(stableHistory);
      
      const score = await service.calculateTvlStabilityScore('test-vault-id');
      expect(score).toBe(75);
    });
  });

  describe('calculateDrawdownScore', () => {
    it('should return 50 for insufficient data (less than 2 history entries)', async () => {
      jest.spyOn(apyHistoryRepo, 'find').mockResolvedValue([mockApyHistory[0]]);
      
      const score = await service.calculateDrawdownScore('test-vault-id');
      expect(score).toBe(50);
    });

    it('should return 100 for no drawdown', async () => {
      const increasingHistory = [
        { ...mockApyHistory[0], apy: 0.08 },
        { ...mockApyHistory[1], apy: 0.10 },
        { ...mockApyHistory[2], apy: 0.12 },
      ];
      jest.spyOn(apyHistoryRepo, 'find').mockResolvedValue(increasingHistory);
      
      const score = await service.calculateDrawdownScore('test-vault-id');
      expect(score).toBe(100);
    });

    it('should return 75 for small drawdown (<= 10%)', async () => {
      const historyWithSmallDrawdown = [
        { ...mockApyHistory[0], apy: 0.10 },
        { ...mockApyHistory[1], apy: 0.095 },
        { ...mockApyHistory[2], apy: 0.09 },
      ];
      jest.spyOn(apyHistoryRepo, 'find').mockResolvedValue(historyWithSmallDrawdown);
      
      const score = await service.calculateDrawdownScore('test-vault-id');
      expect(score).toBe(75);
    });
  });

  describe('calculateOperatorScore', () => {
    it('should return 25 for vault less than 1 month old', () => {
      const recentVault = { ...mockVault, createdAt: new Date() };
      const score = service.calculateOperatorScore(recentVault);
      expect(score).toBe(25);
    });

    it('should return 50 for vault 1-6 months old', () => {
      const monthOldVault = { ...mockVault, createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) };
      const score = service.calculateOperatorScore(monthOldVault);
      expect(score).toBe(50);
    });

    it('should return 75 for vault 6+ months old', () => {
      const sixMonthOldVault = { ...mockVault, createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000) };
      const score = service.calculateOperatorScore(sixMonthOldVault);
      expect(score).toBe(75);
    });

    it('should return 100 for vault 1+ year old', () => {
      const yearOldVault = { ...mockVault, createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000) };
      const score = service.calculateOperatorScore(yearOldVault);
      expect(score).toBe(100);
    });
  });

  describe('calculateVaultScore', () => {
    it('should calculate weighted score correctly', async () => {
      jest.spyOn(apyHistoryRepo, 'find').mockResolvedValue(mockApyHistory);
      
      const result = await service.calculateVaultScore(mockVault);
      
      expect(result.strategyScore).toBeGreaterThanOrEqual(0);
      expect(result.strategyScore).toBeLessThanOrEqual(100);
      expect(result.apyScore).toBe(75);
      expect(result.tvlStabilityScore).toBe(100);
      expect(result.drawdownScore).toBe(100);
      expect(result.operatorScore).toBe(25);
    });
  });

  describe('getVaultScoreBreakdown', () => {
    it('should throw error for non-existent vault', async () => {
      jest.spyOn(vaultRepo, 'findOne').mockResolvedValue(null);
      
      await expect(service.getVaultScoreBreakdown('non-existent-id')).rejects.toThrow('Vault not found');
    });

    it('should return score breakdown for existing vault', async () => {
      jest.spyOn(vaultRepo, 'findOne').mockResolvedValue(mockVault);
      jest.spyOn(apyHistoryRepo, 'find').mockResolvedValue(mockApyHistory);
      
      const result = await service.getVaultScoreBreakdown('test-vault-id');
      
      expect(result).toHaveProperty('strategyScore');
      expect(result).toHaveProperty('apyScore');
      expect(result).toHaveProperty('tvlStabilityScore');
      expect(result).toHaveProperty('drawdownScore');
      expect(result).toHaveProperty('operatorScore');
    });
  });

  describe('recalculateAllVaultScores', () => {
    it('should update all vaults and save history', async () => {
      jest.spyOn(vaultRepo, 'find').mockResolvedValue([mockVault]);
      jest.spyOn(apyHistoryRepo, 'find').mockResolvedValue(mockApyHistory);
      jest.spyOn(vaultRepo, 'update').mockResolvedValue({} as any);
      jest.spyOn(scoreHistoryRepo, 'save').mockResolvedValue({} as any);
      
      await service.recalculateAllVaultScores();
      
      expect(vaultRepo.update).toHaveBeenCalledWith(mockVault.id, expect.objectContaining({
        strategyScore: expect.any(Number),
      }));
      expect(scoreHistoryRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        vaultId: mockVault.id,
        strategyScore: expect.any(Number),
      }));
    });
  });

  describe('getVaultScoreHistory', () => {
    it('should return score history for a vault', async () => {
      const mockHistory: VaultScoreHistory[] = [
        { id: '1', vaultId: 'test-vault-id', strategyScore: 75, apyScore: 75, tvlStabilityScore: 100, drawdownScore: 100, operatorScore: 25, snapshotDate: new Date(), createdAt: new Date() } as VaultScoreHistory,
      ];
      jest.spyOn(scoreHistoryRepo, 'find').mockResolvedValue(mockHistory);
      
      const result = await service.getVaultScoreHistory('test-vault-id');
      
      expect(result).toEqual(mockHistory);
    });
  });
});