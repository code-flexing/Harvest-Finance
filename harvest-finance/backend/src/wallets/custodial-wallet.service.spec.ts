import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CustodialWalletService } from './custodial-wallet.service';
import { CustodialWallet } from './entities/custodial-wallet.entity';
import { CustomLoggerService } from '../logger/custom-logger.service';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRepository = () => ({
  findOne: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'CUSTODIAL_WALLET_ENCRYPTION_PEPPER') {
      // 32-byte hex string for tests
      return 'a'.repeat(64);
    }
    if (key === 'NODE_ENV') return 'test';
    return undefined;
  }),
};

const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// ── Test suite ────────────────────────────────────────────────────────────────

describe('CustodialWalletService', () => {
  let service: CustodialWalletService;
  let repo: jest.Mocked<Repository<CustodialWallet>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustodialWalletService,
        { provide: getRepositoryToken(CustodialWallet), useFactory: mockRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<CustodialWalletService>(CustodialWalletService);
    repo = module.get(getRepositoryToken(CustodialWallet));
  });

  afterEach(() => jest.clearAllMocks());

  // ── createCustodialWallet ──────────────────────────────────────────────────

  describe('createCustodialWallet', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const password = 'SecurePass123!';

    it('should create a wallet and return a valid Stellar public key', async () => {
      repo.findOne.mockResolvedValue(null); // no existing wallet
      repo.create.mockImplementation((data) => data as CustodialWallet);
      repo.save.mockResolvedValue({} as CustodialWallet);

      const publicKey = await service.createCustodialWallet(userId, password);

      expect(publicKey).toMatch(/^G[A-Z0-9]{55}$/);
      expect(repo.save).toHaveBeenCalledTimes(1);
    }, 15000); // Argon2 is intentionally slow — allow 15s

    it('should throw ConflictException when a wallet already exists', async () => {
      repo.findOne.mockResolvedValue({ id: 'some-id' } as CustodialWallet);

      await expect(service.createCustodialWallet(userId, password)).rejects.toThrow(
        ConflictException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('should store different ciphertexts for different users with the same password', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockImplementation((data) => data as CustodialWallet);
      repo.save.mockResolvedValue({} as CustodialWallet);

      const capturedWallets: any[] = [];
      repo.save.mockImplementation(async (wallet) => {
        capturedWallets.push(wallet);
        return wallet as CustodialWallet;
      });

      const userId2 = '223e4567-e89b-12d3-a456-426614174000';

      await service.createCustodialWallet(userId, password);
      await service.createCustodialWallet(userId2, password);

      expect(capturedWallets).toHaveLength(2);
      // Different IVs ensure different ciphertexts even if passwords match
      expect(capturedWallets[0].iv).not.toBe(capturedWallets[1].iv);
      // Different Argon2 salts
      expect(capturedWallets[0].argon2Params.salt).not.toBe(
        capturedWallets[1].argon2Params.salt,
      );
    }, 20000);
  });

  // ── exportPrivateKey ───────────────────────────────────────────────────────

  describe('exportPrivateKey', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const password = 'SecurePass123!';

    /**
     * Helper: creates a wallet and captures the persisted data for round-trip tests.
     */
    async function createAndCaptureWallet(): Promise<CustodialWallet> {
      let savedWallet!: CustodialWallet;

      repo.findOne.mockResolvedValueOnce(null);
      repo.create.mockImplementation((data) => data as CustodialWallet);
      repo.save.mockImplementation(async (wallet) => {
        savedWallet = wallet as CustodialWallet;
        return wallet as CustodialWallet;
      });

      await service.createCustodialWallet(userId, password);
      return savedWallet;
    }

    it('should decrypt and return the correct Stellar secret key', async () => {
      const savedWallet = await createAndCaptureWallet();

      // Mock the query builder used in exportPrivateKey
      const qbMock = {
        where: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(savedWallet),
      };
      repo.createQueryBuilder.mockReturnValue(qbMock as any);

      const secretKey = await service.exportPrivateKey(userId, password);

      // Validate that the returned key is a valid Stellar secret key format
      expect(secretKey).toMatch(/^S[A-Z0-9]{55}$/);
    }, 20000);

    it('should throw UnauthorizedException on wrong password', async () => {
      const savedWallet = await createAndCaptureWallet();

      const qbMock = {
        where: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(savedWallet),
      };
      repo.createQueryBuilder.mockReturnValue(qbMock as any);

      await expect(
        service.exportPrivateKey(userId, 'WrongPassword99!'),
      ).rejects.toThrow(UnauthorizedException);
    }, 20000);

    it('should throw NotFoundException when no wallet exists', async () => {
      const qbMock = {
        where: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      repo.createQueryBuilder.mockReturnValue(qbMock as any);

      await expect(service.exportPrivateKey(userId, password)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── getPublicKey ───────────────────────────────────────────────────────────

  describe('getPublicKey', () => {
    it('should return the public key when a wallet exists', async () => {
      const publicKey = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      repo.findOne.mockResolvedValue({ publicKey } as CustodialWallet);

      const result = await service.getPublicKey('user-id');
      expect(result).toBe(publicKey);
    });

    it('should return null when no wallet exists', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.getPublicKey('user-id');
      expect(result).toBeNull();
    });
  });

  // ── hasCustodialWallet ─────────────────────────────────────────────────────

  describe('hasCustodialWallet', () => {
    it('should return true when a wallet exists', async () => {
      repo.count.mockResolvedValue(1);
      expect(await service.hasCustodialWallet('user-id')).toBe(true);
    });

    it('should return false when no wallet exists', async () => {
      repo.count.mockResolvedValue(0);
      expect(await service.hasCustodialWallet('user-id')).toBe(false);
    });
  });
});
