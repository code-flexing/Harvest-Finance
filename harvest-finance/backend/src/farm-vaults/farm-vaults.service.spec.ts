import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FarmVaultsService } from './farm-vaults.service';

describe('FarmVaultsService - amount validation', () => {
  let service: FarmVaultsService;
  let mockVaultRepo: any;
  let mockCropRepo: any;
  let mockDataSource: any;
  let mockGateway: any;

  const userId = 'user-1';
  const vaultId = 'vault-1';

  beforeEach(() => {
    mockVaultRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
    mockCropRepo = { findOne: jest.fn() };
    mockDataSource = {};
    mockGateway = { emitDeposit: jest.fn(), emitMilestone: jest.fn() };

    service = new FarmVaultsService(
      mockVaultRepo,
      mockCropRepo,
      mockDataSource,
      mockGateway,
    );
  });

  describe('deposit()', () => {
    it('accepts a valid positive amount', async () => {
      const existing = {
        id: vaultId,
        userId,
        name: 'V',
        targetAmount: 1000,
        balance: 10,
      };
      mockVaultRepo.findOne.mockResolvedValue(existing);
      mockVaultRepo.save.mockImplementation(async (v: any) => v);

      const saved = await service.deposit(vaultId, userId, 50);
      expect(mockVaultRepo.findOne).toHaveBeenCalledWith({
        where: { id: vaultId, userId },
      });
      expect(saved.balance).toBeDefined();
      expect(Number(saved.balance)).toBeCloseTo(60);
    });

    it('rejects zero amount', async () => {
      await expect(service.deposit(vaultId, userId, 0)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deposit(vaultId, userId, 0)).rejects.toThrow(
        'Deposit amount must be greater than 0',
      );
    });

    it('rejects negative amount', async () => {
      await expect(service.deposit(vaultId, userId, -1 as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('handles very small positive amounts (boundary)', async () => {
      const existing = {
        id: vaultId,
        userId,
        name: 'V',
        targetAmount: 1000,
        balance: 0,
      };
      mockVaultRepo.findOne.mockResolvedValue(existing);
      mockVaultRepo.save.mockImplementation(async (v: any) => v);

      const amount = 0.01;
      const saved = await service.deposit(vaultId, userId, amount);
      expect(Number(saved.balance)).toBeCloseTo(amount);
    });

    it('handles very large amounts', async () => {
      const existing = {
        id: vaultId,
        userId,
        name: 'V',
        targetAmount: 1e18,
        balance: 0,
      };
      mockVaultRepo.findOne.mockResolvedValue(existing);
      mockVaultRepo.save.mockImplementation(async (v: any) => v);

      const amount = 1e12;
      const saved = await service.deposit(vaultId, userId, amount);
      expect(Number(saved.balance)).toBeCloseTo(amount);
    });
  });

  describe('withdraw()', () => {
    it('accepts valid positive amount and updates balance', async () => {
      const existing = {
        id: vaultId,
        userId,
        name: 'V',
        targetAmount: 1000,
        balance: 500,
      };
      mockVaultRepo.findOne.mockResolvedValue(existing);
      mockVaultRepo.save.mockImplementation(async (v: any) => v);

      const saved = await service.withdraw(vaultId, userId, 200);
      expect(Number(saved.balance)).toBeCloseTo(300);
    });

    it('rejects zero withdrawal', async () => {
      await expect(service.withdraw(vaultId, userId, 0)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects negative withdrawal', async () => {
      await expect(
        service.withdraw(vaultId, userId, -5 as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects withdrawal greater than balance', async () => {
      const existing = {
        id: vaultId,
        userId,
        name: 'V',
        targetAmount: 1000,
        balance: 100,
      };
      mockVaultRepo.findOne.mockResolvedValue(existing);
      await expect(service.withdraw(vaultId, userId, 101)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.withdraw(vaultId, userId, 101)).rejects.toThrow(
        'Insufficient balance in farm vault',
      );
    });

    it('boundary tests around balance', async () => {
      const balance = 1000;
      mockVaultRepo.save.mockImplementation(async (v: any) => v);

      // balance - 1 (start with fresh vault having full balance)
      mockVaultRepo.findOne.mockResolvedValueOnce({
        id: vaultId,
        userId,
        name: 'V',
        targetAmount: 1e6,
        balance,
      });
      let saved = await service.withdraw(vaultId, userId, balance - 1);
      expect(Number(saved.balance)).toBeCloseTo(1);

      // balance (start fresh again)
      mockVaultRepo.findOne.mockResolvedValueOnce({
        id: vaultId,
        userId,
        name: 'V',
        targetAmount: 1e6,
        balance,
      });
      saved = await service.withdraw(vaultId, userId, balance);
      expect(Number(saved.balance)).toBeCloseTo(0);

      // attempt balance + 1 -> should fail (fresh vault)
      mockVaultRepo.findOne.mockResolvedValueOnce({
        id: vaultId,
        userId,
        name: 'V',
        targetAmount: 1e6,
        balance,
      });
      await expect(
        service.withdraw(vaultId, userId, balance + 1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('throws NotFound when vault is missing for deposit/withdraw', async () => {
    mockVaultRepo.findOne.mockResolvedValue(null);
    await expect(service.deposit(vaultId, userId, 1)).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.withdraw(vaultId, userId, 1)).rejects.toThrow(
      NotFoundException,
    );
  });
});
