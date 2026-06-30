import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SimulationService } from './simulation.service';
import { Vault } from '../database/entities/vault.entity';

describe('SimulationService', () => {
  let service: SimulationService;
  let vaultRepository: Repository<Vault>;

  const mockVault: Partial<Vault> = {
    id: 'test-vault-id',
    vaultName: 'Test Vault',
    interestRate: 12.5,
    totalDeposits: 10000,
    lockPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulationService,
        {
          provide: getRepositoryToken(Vault),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
    vaultRepository = module.get<Repository<Vault>>(getRepositoryToken(Vault));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('simulateDeposit', () => {
    it('should simulate a deposit successfully', async () => {
      jest.spyOn(vaultRepository, 'findOne').mockResolvedValue(mockVault as any);

      const result = await service.simulateDeposit('test-vault-id', {
        amount: 1000,
      });

      expect(result).toBeDefined();
      expect(result.vaultId).toBe('test-vault-id');
      expect(result.depositAmount).toBe(1000);
      expect(result.feesDeducted).toBeCloseTo(5, 1); // 0.5% of 1000
      expect(result.expectedNetAmount).toBeCloseTo(995, 1);
      expect(result.projectedAPY).toBe(12.5);
      expect(result.lockExpiry).toBeDefined();
      expect(result.simulatedAt).toBeDefined();
    });

    it('should throw NotFoundException when vault does not exist', async () => {
      jest.spyOn(vaultRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.simulateDeposit('non-existent-vault', { amount: 1000 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for negative amount', async () => {
      jest.spyOn(vaultRepository, 'findOne').mockResolvedValue(mockVault as any);

      await expect(
        service.simulateDeposit('test-vault-id', { amount: -100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for zero amount', async () => {
      jest.spyOn(vaultRepository, 'findOne').mockResolvedValue(mockVault as any);

      await expect(
        service.simulateDeposit('test-vault-id', { amount: 0 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('simulateStrategyChange', () => {
    it('should simulate a strategy change successfully', async () => {
      jest.spyOn(vaultRepository, 'findOne').mockResolvedValue(mockVault as any);

      const result = await service.simulateStrategyChange('test-vault-id', {
        newAPY: 15.5,
      });

      expect(result).toBeDefined();
      expect(result.vaultId).toBe('test-vault-id');
      expect(result.currentAPY).toBe(12.5);
      expect(result.newAPY).toBe(15.5);
      expect(result.apyImpact).toBeCloseTo(3, 1);
      expect(result.rebalancingCost).toBeDefined();
      expect(result.simulatedAt).toBeDefined();
    });

    it('should throw NotFoundException when vault does not exist', async () => {
      jest.spyOn(vaultRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.simulateStrategyChange('non-existent-vault', { newAPY: 15 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use current APY if newAPY not provided', async () => {
      jest.spyOn(vaultRepository, 'findOne').mockResolvedValue(mockVault as any);

      const result = await service.simulateStrategyChange('test-vault-id', {});

      expect(result.currentAPY).toBe(12.5);
      expect(result.newAPY).toBe(12.5);
      expect(result.apyImpact).toBe(0);
    });
  });
});
