import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { VaultsService } from './vaults.service';
import { Vault, VaultDeposit } from '../database/entities';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('VaultsService', () => {
  let service: VaultsService;
  let dataSource: DataSource;

  const mockVault = {
    id: 'vault-1',
    name: 'Test Vault',
    totalDeposits: 1000,
    liquidity: 500,
  };

  const mockUserDeposit = {
    id: 'deposit-1',
    balance: 200,
    user: { id: 'user-1' },
    vault: { id: 'vault-1' },
  };

  const mockEntityManager = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((cb) => cb(mockEntityManager)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultsService,
        {
          provide: getRepositoryToken(Vault),
          useValue: {},
        },
        {
          provide: getRepositoryToken(VaultDeposit),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<VaultsService>(VaultsService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('withdraw', () => {
    it('should successfully withdraw tokens', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce({ ...mockVault }) // First call for Vault
        .mockResolvedValueOnce({ ...mockUserDeposit }); // Second call for VaultDeposit

      mockEntityManager.save.mockImplementation((entity, data) => Promise.resolve(data));

      const result = await service.withdraw('vault-1', {
        userId: 'user-1',
        amount: 100,
      });

      expect(result.userBalance).toBe(100);
      expect(result.vault.totalDeposits).toBe(900);
      expect(result.vault.liquidity).toBe(400);
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if vault not found', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.withdraw('non-existent', { userId: 'user-1', amount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient liquidity', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce({ ...mockVault, liquidity: 50 });

      await expect(
        service.withdraw('vault-1', { userId: 'user-1', amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user deposit not found', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce({ ...mockVault })
        .mockResolvedValueOnce(null);

      await expect(
        service.withdraw('vault-1', { userId: 'user-2', amount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient user balance', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce({ ...mockVault })
        .mockResolvedValueOnce({ ...mockUserDeposit, balance: 50 });

      await expect(
        service.withdraw('vault-1', { userId: 'user-1', amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
