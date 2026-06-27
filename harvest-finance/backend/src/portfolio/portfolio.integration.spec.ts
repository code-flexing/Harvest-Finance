import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PortfolioService } from './portfolio.service';
import { StellarService } from '../stellar/services/stellar.service';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';
import { Vault, VaultType } from '../database/entities/vault.entity';
import { User } from '../database/entities/user.entity';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const VAULT_A_ID = '22222222-2222-2222-2222-222222222222';
const VAULT_B_ID = '33333333-3333-3333-3333-333333333333';
const VAULT_C_ID = '44444444-4444-4444-4444-444444444444';
const STELLAR_KEY_A =
  'GASVN2GNYP2DZCASZ6MOPS3RO26UIT6ZKH4ORN2FKTIQFD5P5OUKJPFW';
const STELLAR_KEY_B =
  'GB26SVHUCWUATM5KXLYXD4TSLY7HP62RJYUMV5A7UZYY3QIRWY62XVEB';

const buildVaultQB = (
  rows: { vaultId: string; balance: string }[],
) => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue(rows),
});

describe('PortfolioService — Balance Aggregation Integration', () => {
  let service: PortfolioService;

  const mockStellarService = {
    getAccountBalances: jest.fn(),
  };

  const mockDepositRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockVaultRepository = {
    find: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        { provide: StellarService, useValue: mockStellarService },
        {
          provide: getRepositoryToken(Deposit),
          useValue: mockDepositRepository,
        },
        { provide: getRepositoryToken(Vault), useValue: mockVaultRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildPortfolio — vault balance aggregation', () => {
    beforeEach(() => {
      mockUserRepository.findOne.mockResolvedValue({ id: USER_ID });
      mockStellarService.getAccountBalances.mockResolvedValue([]);
    });

    it('should sum confirmed deposits across multiple vaults into totalVaultBalance', async () => {
      const mockQB = buildVaultQB([
        { vaultId: VAULT_A_ID, balance: '1500.25' },
        { vaultId: VAULT_B_ID, balance: '800.50' },
        { vaultId: VAULT_C_ID, balance: '199.25' },
      ]);
      mockDepositRepository.createQueryBuilder.mockReturnValue(mockQB);
      mockVaultRepository.find.mockResolvedValue([
        {
          id: VAULT_A_ID,
          vaultName: 'Crop Vault',
          type: VaultType.CROP_PRODUCTION,
        },
        {
          id: VAULT_B_ID,
          vaultName: 'Equipment Vault',
          type: VaultType.EQUIPMENT_FINANCING,
        },
        {
          id: VAULT_C_ID,
          vaultName: 'Land Vault',
          type: VaultType.LAND_ACQUISITION,
        },
      ]);

      const portfolio = await service.buildPortfolio(USER_ID, []);

      expect(portfolio.totalVaultBalance).toBeCloseTo(2500, 5);
      expect(portfolio.vaults).toHaveLength(3);
      expect(portfolio.vaults.map((v) => v.balance)).toEqual(
        expect.arrayContaining([1500.25, 800.5, 199.25]),
      );
      expect(
        portfolio.vaults.reduce((sum, v) => sum + v.balance, 0),
      ).toBeCloseTo(portfolio.totalVaultBalance, 5);
    });

    it('should return per-vault holdings with vault metadata', async () => {
      const mockQB = buildVaultQB([
        { vaultId: VAULT_A_ID, balance: '1000' },
        { vaultId: VAULT_B_ID, balance: '500' },
      ]);
      mockDepositRepository.createQueryBuilder.mockReturnValue(mockQB);
      mockVaultRepository.find.mockResolvedValue([
        {
          id: VAULT_A_ID,
          vaultName: 'Harvest Yield Vault',
          type: VaultType.CROP_PRODUCTION,
        },
        {
          id: VAULT_B_ID,
          vaultName: 'Tractor Fund',
          type: VaultType.EQUIPMENT_FINANCING,
        },
      ]);

      const portfolio = await service.buildPortfolio(USER_ID, []);

      expect(portfolio.vaults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            vaultId: VAULT_A_ID,
            vaultName: 'Harvest Yield Vault',
            vaultType: VaultType.CROP_PRODUCTION,
            balance: 1000,
          }),
          expect.objectContaining({
            vaultId: VAULT_B_ID,
            vaultName: 'Tractor Fund',
            vaultType: VaultType.EQUIPMENT_FINANCING,
            balance: 500,
          }),
        ]),
      );
    });

    it('should only aggregate CONFIRMED deposits for the user', async () => {
      const mockQB = buildVaultQB([{ vaultId: VAULT_A_ID, balance: '750' }]);
      mockDepositRepository.createQueryBuilder.mockReturnValue(mockQB);
      mockVaultRepository.find.mockResolvedValue([
        {
          id: VAULT_A_ID,
          vaultName: 'Crop Vault',
          type: VaultType.CROP_PRODUCTION,
        },
      ]);

      await service.buildPortfolio(USER_ID, []);

      expect(mockQB.where).toHaveBeenCalledWith('deposit.userId = :userId', {
        userId: USER_ID,
      });
      expect(mockQB.andWhere).toHaveBeenCalledWith('deposit.status = :status', {
        status: DepositStatus.CONFIRMED,
      });
      expect(mockQB.groupBy).toHaveBeenCalledWith('deposit.vaultId');
    });

    it('should return empty vaults and zero total when user has no confirmed deposits', async () => {
      const mockQB = buildVaultQB([]);
      mockDepositRepository.createQueryBuilder.mockReturnValue(mockQB);

      const portfolio = await service.buildPortfolio(USER_ID, []);

      expect(portfolio.vaults).toEqual([]);
      expect(portfolio.totalVaultBalance).toBe(0);
      expect(mockVaultRepository.find).not.toHaveBeenCalled();
    });

    it('should label missing vault records as Unknown Vault', async () => {
      const mockQB = buildVaultQB([
        { vaultId: VAULT_A_ID, balance: '300' },
        { vaultId: '99999999-9999-9999-9999-999999999999', balance: '100' },
      ]);
      mockDepositRepository.createQueryBuilder.mockReturnValue(mockQB);
      mockVaultRepository.find.mockResolvedValue([
        {
          id: VAULT_A_ID,
          vaultName: 'Known Vault',
          type: VaultType.CROP_PRODUCTION,
        },
      ]);

      const portfolio = await service.buildPortfolio(USER_ID, []);

      const unknown = portfolio.vaults.find(
        (v) => v.vaultId === '99999999-9999-9999-9999-999999999999',
      );
      expect(unknown).toMatchObject({
        vaultName: 'Unknown Vault',
        vaultType: 'UNKNOWN',
        balance: 100,
      });
      expect(portfolio.totalVaultBalance).toBe(400);
    });
  });

  describe('buildPortfolio — Stellar balance aggregation', () => {
    beforeEach(() => {
      mockUserRepository.findOne.mockResolvedValue({ id: USER_ID });
      mockDepositRepository.createQueryBuilder.mockReturnValue(buildVaultQB([]));
    });

    it('should aggregate the same asset across multiple Stellar accounts', async () => {
      mockStellarService.getAccountBalances
        .mockResolvedValueOnce([
          { assetCode: 'XLM', assetIssuer: null, balance: '100.1234567' },
          {
            assetCode: 'USDC',
            assetIssuer: 'GISSUER123',
            balance: '50.0000000',
          },
        ])
        .mockResolvedValueOnce([
          { assetCode: 'XLM', assetIssuer: null, balance: '200.0000000' },
          {
            assetCode: 'USDC',
            assetIssuer: 'GISSUER123',
            balance: '25.5000000',
          },
        ]);

      const portfolio = await service.buildPortfolio(USER_ID, [
        STELLAR_KEY_A,
        STELLAR_KEY_B,
      ]);

      expect(portfolio.accounts).toHaveLength(2);
      expect(portfolio.aggregatedStellarBalances).toEqual(
        expect.arrayContaining([
          { assetCode: 'XLM', assetIssuer: null, balance: '300.1234567' },
          {
            assetCode: 'USDC',
            assetIssuer: 'GISSUER123',
            balance: '75.5000000',
          },
        ]),
      );
    });

    it('should include the user linked Stellar address when not in the request list', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: USER_ID,
        stellarAddress: STELLAR_KEY_A,
      });
      mockStellarService.getAccountBalances.mockResolvedValue([
        { assetCode: 'XLM', assetIssuer: null, balance: '42.0000000' },
      ]);

      const portfolio = await service.buildPortfolio(USER_ID, [STELLAR_KEY_B]);

      expect(mockStellarService.getAccountBalances).toHaveBeenCalledWith(
        STELLAR_KEY_A,
      );
      expect(mockStellarService.getAccountBalances).toHaveBeenCalledWith(
        STELLAR_KEY_B,
      );
      expect(portfolio.accounts.map((a) => a.publicKey)).toEqual(
        expect.arrayContaining([STELLAR_KEY_A, STELLAR_KEY_B]),
      );
    });

    it('should record invalid Stellar keys without failing the portfolio build', async () => {
      const portfolio = await service.buildPortfolio(USER_ID, ['not-a-valid-key']);

      expect(portfolio.accounts[0]).toMatchObject({
        publicKey: 'not-a-valid-key',
        exists: false,
        error: 'Invalid Stellar public key',
        balances: [],
      });
      expect(portfolio.aggregatedStellarBalances).toEqual([]);
      expect(mockStellarService.getAccountBalances).not.toHaveBeenCalled();
    });

    it('should continue aggregation when one account fails to load', async () => {
      mockStellarService.getAccountBalances
        .mockRejectedValueOnce({ response: { status: 404 } })
        .mockResolvedValueOnce([
          { assetCode: 'XLM', assetIssuer: null, balance: '10.0000000' },
        ]);

      const portfolio = await service.buildPortfolio(USER_ID, [
        STELLAR_KEY_A,
        STELLAR_KEY_B,
      ]);

      expect(portfolio.accounts[0]).toMatchObject({
        exists: false,
        error: 'Account not found',
      });
      expect(portfolio.aggregatedStellarBalances).toEqual([
        { assetCode: 'XLM', assetIssuer: null, balance: '10.0000000' },
      ]);
    });
  });

  describe('buildPortfolio — response shape', () => {
    it('should include userId and generatedAt timestamp', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: USER_ID });
      mockDepositRepository.createQueryBuilder.mockReturnValue(buildVaultQB([]));
      mockStellarService.getAccountBalances.mockResolvedValue([]);

      const portfolio = await service.buildPortfolio(USER_ID, []);

      expect(portfolio.userId).toBe(USER_ID);
      expect(portfolio.generatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });
  });
});
