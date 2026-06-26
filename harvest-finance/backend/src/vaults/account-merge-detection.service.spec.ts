import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AccountMergeDetectionService } from './account-merge-detection.service';
import { Vault, VaultStatus } from '../database/entities/vault.entity';
import { User } from '../database/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../database/entities/notification.entity';

const mockVaultRepository = () => ({
  find: jest.fn(),
  findBy: jest.fn(),
  update: jest.fn(),
});

const mockUserRepository = () => ({
  find: jest.fn(),
  findBy: jest.fn(),
});

const mockNotificationsService = () => ({
  create: jest.fn().mockResolvedValue({}),
});

const mockServer = {
  loadAccount: jest.fn(),
};

jest.mock('stellar-sdk', () => ({
  Horizon: {
    Server: jest.fn().mockImplementation(() => mockServer),
  },
}));

describe('AccountMergeDetectionService', () => {
  let service: AccountMergeDetectionService;
  let vaultRepo: ReturnType<typeof mockVaultRepository>;
  let userRepo: ReturnType<typeof mockUserRepository>;
  let notificationsService: ReturnType<typeof mockNotificationsService>;

  const activeVault = {
    id: 'vault-001',
    ownerId: 'user-001',
    status: VaultStatus.ACTIVE,
  } as Vault;

  const vaultOwner = {
    id: 'user-001',
    stellarAddress: 'GDQP2CHOUZQCIBXIHLFS4D5R7U6WCCSPHQFUG7HOUCQ2YVS6A5W5Y5YG',
  } as User;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountMergeDetectionService,
        { provide: getRepositoryToken(Vault), useFactory: mockVaultRepository },
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
        { provide: NotificationsService, useFactory: mockNotificationsService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, def?: string) => {
              const cfg: Record<string, string> = {
                STELLAR_NETWORK: 'testnet',
                NODE_ENV: 'production',
              };
              return cfg[key] ?? def;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AccountMergeDetectionService);
    vaultRepo = module.get(getRepositoryToken(Vault));
    userRepo = module.get(getRepositoryToken(User));
    notificationsService = module.get(NotificationsService);
  });

  describe('checkVaultAccountExistence', () => {
    it('skips all checks in test environment', async () => {
      const module = await Test.createTestingModule({
        providers: [
          AccountMergeDetectionService,
          { provide: getRepositoryToken(Vault), useFactory: mockVaultRepository },
          { provide: getRepositoryToken(User), useFactory: mockUserRepository },
          { provide: NotificationsService, useFactory: mockNotificationsService },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key: string, def?: string) =>
                key === 'NODE_ENV' ? 'test' : def,
              ),
            },
          },
        ],
      }).compile();
      const testService = module.get(AccountMergeDetectionService);
      const testVaultRepo = module.get(getRepositoryToken(Vault));
      await testService.checkVaultAccountExistence();
      expect(testVaultRepo.find).not.toHaveBeenCalled();
    });

    it('does nothing when no vaults exist', async () => {
      vaultRepo.find.mockResolvedValue([]);
      await service.checkVaultAccountExistence();
      expect(mockServer.loadAccount).not.toHaveBeenCalled();
    });

    it('skips vault owners without a stellarAddress', async () => {
      vaultRepo.find.mockResolvedValue([activeVault]);
      userRepo.findBy.mockResolvedValue([{ id: 'user-001', stellarAddress: null }]);
      await service.checkVaultAccountExistence();
      expect(mockServer.loadAccount).not.toHaveBeenCalled();
    });

    it('calls loadAccount for each vault owner with a stellarAddress', async () => {
      vaultRepo.find.mockResolvedValue([activeVault]);
      userRepo.findBy.mockResolvedValue([vaultOwner]);
      mockServer.loadAccount.mockResolvedValue({});
      await service.checkVaultAccountExistence();
      expect(mockServer.loadAccount).toHaveBeenCalledWith(vaultOwner.stellarAddress);
    });
  });

  describe('checkAccount – account exists', () => {
    it('does not suspend the vault when loadAccount succeeds', async () => {
      mockServer.loadAccount.mockResolvedValue({});
      await service.checkAccount(activeVault, vaultOwner.stellarAddress!);
      expect(vaultRepo.update).not.toHaveBeenCalled();
      expect(notificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('checkAccount – account not found (merged)', () => {
    const notFoundError = Object.assign(new Error('not found'), {
      response: { status: 404 },
    });

    it('sets vault status to FROZEN', async () => {
      mockServer.loadAccount.mockRejectedValue(notFoundError);
      await service.checkAccount(activeVault, vaultOwner.stellarAddress!);
      expect(vaultRepo.update).toHaveBeenCalledWith(activeVault.id, {
        status: VaultStatus.FROZEN,
      });
    });

    it('writes an audit notification (adminOnly, SYSTEM type)', async () => {
      mockServer.loadAccount.mockRejectedValue(notFoundError);
      await service.checkAccount(activeVault, vaultOwner.stellarAddress!);

      const auditCall = notificationsService.create.mock.calls.find(
        ([dto]: any[]) => dto.type === NotificationType.SYSTEM,
      );
      expect(auditCall).toBeDefined();
      expect(auditCall[0].adminOnly).toBe(true);
      expect(auditCall[0].message).toContain(activeVault.id);
      expect(auditCall[0].message).toContain(vaultOwner.stellarAddress);
    });

    it('sends an admin alert notification (adminOnly, ERROR type)', async () => {
      mockServer.loadAccount.mockRejectedValue(notFoundError);
      await service.checkAccount(activeVault, vaultOwner.stellarAddress!);

      const alertCall = notificationsService.create.mock.calls.find(
        ([dto]: any[]) => dto.type === NotificationType.ERROR,
      );
      expect(alertCall).toBeDefined();
      expect(alertCall[0].adminOnly).toBe(true);
      expect(alertCall[0].message).toContain(activeVault.id);
      expect(alertCall[0].message).toContain(vaultOwner.stellarAddress);
    });

    it('creates exactly 2 notifications (audit + alert)', async () => {
      mockServer.loadAccount.mockRejectedValue(notFoundError);
      await service.checkAccount(activeVault, vaultOwner.stellarAddress!);
      expect(notificationsService.create).toHaveBeenCalledTimes(2);
    });

    it('does not suspend or alert for non-404 errors', async () => {
      mockServer.loadAccount.mockRejectedValue(new Error('Network timeout'));
      await service.checkAccount(activeVault, vaultOwner.stellarAddress!);
      expect(vaultRepo.update).not.toHaveBeenCalled();
      expect(notificationsService.create).not.toHaveBeenCalled();
    });
  });
});
