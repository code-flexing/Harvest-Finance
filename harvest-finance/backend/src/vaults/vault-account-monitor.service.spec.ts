import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Not, IsNull, Equal } from 'typeorm';
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
    ownerId: 'user-1',
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
    it('queries with correct select and where clause', async () => {
      mockVaultRepository.find.mockResolvedValue([]);

      await service.checkAllVaults();

      expect(mockVaultRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.arrayContaining(['id', 'stellarAccountAddress', 'status', 'ownerId', 'vaultName']),
          where: expect.objectContaining({
            stellarAccountAddress: Not(IsNull()),
            status: Not(Equal(VaultStatus.SUSPENDED)),
          }),
        }),
      );
    });

    it('checks vaults returned by the repository', async () => {
      const vault = makeVault();
      mockVaultRepository.find.mockResolvedValue([vault]);
      mockStellarService.getAccountInfo.mockResolvedValue({ publicKey: vault.stellarAccountAddress });

      await service.checkAllVaults();

      expect(mockStellarService.getAccountInfo).toHaveBeenCalledWith(vault.stellarAccountAddress);
    });

    it('skips concurrent execution when already running', async () => {
      let resolvePending: () => void;
      const pending = new Promise<void>((res) => { resolvePending = res; });

      mockVaultRepository.find.mockReturnValueOnce(pending.then(() => []));

      const first = service.checkAllVaults();
      // Second call fires while first is still awaiting the repository
      const second = service.checkAllVaults();
      resolvePending!();
      await Promise.all([first, second]);

      // Repository should only be called once despite two concurrent calls
      expect(mockVaultRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkSingleVault', () => {
    it('suspends vault and creates owner + admin notifications when account returns 404', async () => {
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

      // Owner notification
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: vault.ownerId,
          adminOnly: false,
          type: NotificationType.SYSTEM,
        }),
      );

      // Admin broadcast notification
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          adminOnly: true,
          type: NotificationType.SYSTEM,
        }),
      );

      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
    });

    it('does not suspend vault when getAccountInfo succeeds', async () => {
      const vault = makeVault();
      mockStellarService.getAccountInfo.mockResolvedValue({ publicKey: vault.stellarAccountAddress });

      await service.checkSingleVault(vault);

      expect(mockVaultRepository.update).not.toHaveBeenCalled();
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('suspends vault when error has status 404 (fallback check)', async () => {
      const vault = makeVault();
      const err = Object.assign(new Error('Not Found'), { status: 404 });
      mockStellarService.getAccountInfo.mockRejectedValue(err);
      mockVaultRepository.update.mockResolvedValue({});
      mockNotificationsService.create.mockResolvedValue({});

      await service.checkSingleVault(vault);

      expect(mockVaultRepository.update).toHaveBeenCalledWith(vault.id, {
        status: VaultStatus.SUSPENDED,
      });
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

    it('is idempotent — checkAllVaults excludes SUSPENDED vaults via WHERE clause', async () => {
      // The repository WHERE clause filters out SUSPENDED vaults; simulate empty result
      mockVaultRepository.find.mockResolvedValue([]);

      await service.checkAllVaults();

      expect(mockStellarService.getAccountInfo).not.toHaveBeenCalled();
      expect(mockVaultRepository.update).not.toHaveBeenCalled();
    });
  });
});
