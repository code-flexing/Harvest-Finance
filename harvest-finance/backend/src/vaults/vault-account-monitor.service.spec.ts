import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Vault, VaultStatus } from '../database/entities/vault.entity';
import { NotificationType } from '../database/entities/notification.entity';
import { VaultAccountMonitorService } from './vault-account-monitor.service';
import { StellarService } from '../stellar/services/stellar.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockVaultRepository = {
  find: jest.fn(),
  update: jest.fn(),
};

const mockStellarService = {
  getAccountInfo: jest.fn(),
};

const mockNotificationsService = {
  create: jest.fn(),
};

const mockSchedulerRegistry = {
  addCronJob: jest.fn(),
};

function makeVault(overrides: Partial<Vault> = {}): Vault {
  return {
    id: 'vault-1',
    vaultName: 'Test Vault',
    status: VaultStatus.ACTIVE,
    stellarAccountAddress: 'GABC1234567890123456789012345678901234567890123456',
    ...overrides,
  } as Vault;
}

describe('VaultAccountMonitorService', () => {
  let service: VaultAccountMonitorService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultAccountMonitorService,
        { provide: getRepositoryToken(Vault), useValue: mockVaultRepository },
        { provide: StellarService, useValue: mockStellarService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
      ],
    }).compile();

    service = module.get<VaultAccountMonitorService>(VaultAccountMonitorService);
  });

  describe('checkAllVaults', () => {
    it('skips vaults with no stellarAccountAddress', async () => {
      const vault = makeVault({ stellarAccountAddress: null });
      mockVaultRepository.find.mockResolvedValue([vault]);

      await service.checkAllVaults();

      expect(mockStellarService.getAccountInfo).not.toHaveBeenCalled();
    });

    it('skips vaults already SUSPENDED', async () => {
      const vault = makeVault({ status: VaultStatus.SUSPENDED });
      mockVaultRepository.find.mockResolvedValue([vault]);

      await service.checkAllVaults();

      expect(mockStellarService.getAccountInfo).not.toHaveBeenCalled();
    });

    it('checks vaults that have a stellarAccountAddress and are not suspended', async () => {
      const vault = makeVault();
      mockVaultRepository.find.mockResolvedValue([vault]);
      mockStellarService.getAccountInfo.mockResolvedValue({ publicKey: vault.stellarAccountAddress });

      await service.checkAllVaults();

      expect(mockStellarService.getAccountInfo).toHaveBeenCalledWith(vault.stellarAccountAddress);
    });
  });

  describe('checkSingleVault', () => {
    it('suspends vault and creates notification when account returns 404', async () => {
      const vault = makeVault();
      mockStellarService.getAccountInfo.mockRejectedValue(
        new BadRequestException('Stellar resource not found (context: getAccountInfo(GABC...))'),
      );
      mockVaultRepository.update.mockResolvedValue({});
      mockNotificationsService.create.mockResolvedValue({});

      await service.checkSingleVault(vault);

      expect(mockVaultRepository.update).toHaveBeenCalledWith(vault.id, {
        status: VaultStatus.SUSPENDED,
      });
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          adminOnly: true,
          type: NotificationType.SYSTEM,
        }),
      );
    });

    it('does not suspend vault when getAccountInfo succeeds', async () => {
      const vault = makeVault();
      mockStellarService.getAccountInfo.mockResolvedValue({ publicKey: vault.stellarAccountAddress });

      await service.checkSingleVault(vault);

      expect(mockVaultRepository.update).not.toHaveBeenCalled();
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('does not suspend vault on non-404 errors', async () => {
      const vault = makeVault();
      mockStellarService.getAccountInfo.mockRejectedValue(
        new Error('Connection timeout'),
      );

      await service.checkSingleVault(vault);

      expect(mockVaultRepository.update).not.toHaveBeenCalled();
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('does not suspend vault on BadRequestException that is not a not-found error', async () => {
      const vault = makeVault();
      mockStellarService.getAccountInfo.mockRejectedValue(
        new BadRequestException('Stellar transaction failed: op_underfunded'),
      );

      await service.checkSingleVault(vault);

      expect(mockVaultRepository.update).not.toHaveBeenCalled();
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('is idempotent — already-SUSPENDED vault is skipped in checkAllVaults', async () => {
      const vault = makeVault({ status: VaultStatus.SUSPENDED });
      mockVaultRepository.find.mockResolvedValue([vault]);

      await service.checkAllVaults();

      expect(mockStellarService.getAccountInfo).not.toHaveBeenCalled();
      expect(mockVaultRepository.update).not.toHaveBeenCalled();
    });
  });
});
