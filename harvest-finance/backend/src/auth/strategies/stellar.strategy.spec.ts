import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StellarStrategy } from './stellar.strategy';
import { User } from '../../database/entities/user.entity';
import * as StellarSdk from '@stellar/stellar-sdk';

describe('StellarStrategy', () => {
  let strategy: StellarStrategy;
  let userRepository: jest.Mocked<Repository<User>>;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const testServerSecret =
    'SBX7SARQOFS6IM2HS2N5TVK54AEF55E3FHOXBTWA6IPEEJJ4W5WJWE6W';
  const testNetworkPassphrase = 'Test SDF Network ; September 2015';
  const testClientPublicKey =
    'GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q';

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'STELLAR_SERVER_SECRET':
          return testServerSecret;
        case 'STELLAR_NETWORK_PASSPHRASE':
          return testNetworkPassphrase;
        case 'NODE_ENV':
          return 'test';
        default:
          return undefined;
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    strategy = module.get<StellarStrategy>(StellarStrategy);
    userRepository = module.get(getRepositoryToken(User));
    configService = module.get<ConfigService>(
      ConfigService,
    ) as jest.Mocked<ConfigService>;
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should throw error if STELLAR_SERVER_SECRET is not configured', () => {
      mockConfigService.get.mockReturnValueOnce(undefined);

      expect(
        () => new StellarStrategy(mockConfigService, mockUserRepository as any),
      ).toThrow('STELLAR_SERVER_SECRET environment variable is required');
    });

    it('should use testnet network by default', () => {
      expect(strategy).toBeDefined();
      const publicKey = strategy.getServerPublicKey();
      expect(publicKey).toBe(
        'GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q',
      );
    });
  });

  describe('generateChallenge', () => {
    it('should generate a valid challenge transaction', async () => {
      const challenge = await strategy.generateChallenge(testClientPublicKey);

      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe('string');

      // Verify it's valid XDR
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        challenge,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      expect(transaction.source).toBe(
        'GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q',
      );
      expect(transaction.sequence).toBe('0');
      expect(transaction.operations.length).toBe(1);
      expect(transaction.operations[0].type).toBe('manageData');
      expect(transaction.operations[0].name).toBe('Harvest Finance auth');
      expect(transaction.signatures.length).toBe(1);
    });

    it('should validate client public key format', async () => {
      const invalidPublicKey = 'invalid_key';

      await expect(
        strategy.generateChallenge(invalidPublicKey),
      ).rejects.toThrow('Failed to generate challenge');
    });

    it('should set proper time bounds', async () => {
      const challenge = await strategy.generateChallenge(testClientPublicKey);
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        challenge,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      const now = Math.floor(Date.now() / 1000);
      const minTime = parseInt(transaction.timeBounds?.minTime || '0');
      const maxTime = parseInt(transaction.timeBounds?.maxTime || '0');

      expect(minTime).toBeLessThanOrEqual(now);
      expect(maxTime).toBeGreaterThanOrEqual(now);
      expect(maxTime - minTime).toBe(300); // 5 minutes
    });
  });

  describe('validate', () => {
    let validChallenge: string;

    beforeEach(async () => {
      validChallenge = await strategy.generateChallenge(testClientPublicKey);
    });

    it('should validate a properly signed transaction', async () => {
      // Mock user not found (new user)
      userRepository.findOne.mockResolvedValueOnce(null);

      // Mock user creation
      const newUser = {
        id: 'user-id',
        stellarAddress: testClientPublicKey,
        email: null,
        password: null,
        role: 'USER',
        firstName: 'Stellar',
        lastName: 'User',
        isActive: true,
        lastLogin: new Date(),
      };
      userRepository.create.mockReturnValueOnce(newUser as any);
      userRepository.save.mockResolvedValueOnce(newUser as any);
      userRepository.update.mockResolvedValueOnce(undefined);

      // Parse and sign with client key (simulate client signing)
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        validChallenge,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      // Add client signature
      const clientKeypair = StellarSdk.Keypair.fromSecret(testServerSecret); // Using same key for test
      transaction.sign(clientKeypair);

      const result = await strategy.validate(
        transaction.toEnvelope().toXDR('base64'),
      );

      expect(result).toBeDefined();
      expect(result.stellarAddress).toBe(testClientPublicKey);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { stellarAddress: testClientPublicKey },
      });
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(userRepository.update).toHaveBeenCalledWith(newUser.id, {
        lastLogin: expect.any(Date),
      });
    });

    it('should return existing user if found', async () => {
      const existingUser = {
        id: 'existing-user-id',
        stellarAddress: testClientPublicKey,
        email: 'test@example.com',
        password: 'hashed_password',
        role: 'ADMIN',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        lastLogin: new Date(),
      };
      userRepository.findOne.mockResolvedValueOnce(existingUser as any);
      userRepository.update.mockResolvedValueOnce(undefined);

      // Parse and sign with client key
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        validChallenge,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      const clientKeypair = StellarSdk.Keypair.fromSecret(testServerSecret);
      transaction.sign(clientKeypair);

      const result = await strategy.validate(
        transaction.toEnvelope().toXDR('base64'),
      );

      expect(result).toBe(existingUser);
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(userRepository.update).toHaveBeenCalledWith(existingUser.id, {
        lastLogin: expect.any(Date),
      });
    });

    it('should throw error for inactive user', async () => {
      const inactiveUser = {
        id: 'inactive-user-id',
        stellarAddress: testClientPublicKey,
        isActive: false,
      };
      userRepository.findOne.mockResolvedValueOnce(inactiveUser as any);

      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        validChallenge,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      const clientKeypair = StellarSdk.Keypair.fromSecret(testServerSecret);
      transaction.sign(clientKeypair);

      await expect(
        strategy.validate(transaction.toEnvelope().toXDR('base64')),
      ).rejects.toThrow('User account is deactivated');
    });

    it('should throw error for invalid source account', async () => {
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        validChallenge,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      // Modify source account
      (transaction as any).source = 'INVALID_SOURCE';

      await expect(
        strategy.validate(transaction.toEnvelope().toXDR('base64')),
      ).rejects.toThrow('Invalid source account');
    });

    it('should throw error for invalid sequence number', async () => {
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        validChallenge,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      // Modify sequence number
      (transaction as any).sequence = '1';

      await expect(
        strategy.validate(transaction.toEnvelope().toXDR('base64')),
      ).rejects.toThrow('Invalid sequence number');
    });

    it('should throw error for expired transaction', async () => {
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        validChallenge,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      // Set expired time bounds
      const pastTime = Math.floor(Date.now() / 1000) - 1000;
      (transaction as any).timeBounds = {
        minTime: (pastTime - 300).toString(),
        maxTime: pastTime.toString(),
      };

      await expect(
        strategy.validate(transaction.toEnvelope().toXDR('base64')),
      ).rejects.toThrow('Challenge transaction expired');
    });

    it('should throw error for invalid operation type', async () => {
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        validChallenge,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      // Replace operation with invalid type
      (transaction as any).operations = [
        {
          type: 'payment',
          source: testClientPublicKey,
        },
      ];

      await expect(
        strategy.validate(transaction.toEnvelope().toXDR('base64')),
      ).rejects.toThrow('Invalid operation type');
    });

    it('should throw error for missing server signature', async () => {
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        validChallenge,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      // Remove server signature
      (transaction as any).signatures = [];

      await expect(
        strategy.validate(transaction.toEnvelope().toXDR('base64')),
      ).rejects.toThrow('Server signature missing or invalid');
    });

    it('should throw error for missing client signature', async () => {
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        validChallenge,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      // Only server signature present (no client signature)
      // This is the default state from generateChallenge

      await expect(
        strategy.validate(transaction.toEnvelope().toXDR('base64')),
      ).rejects.toThrow('Client signature missing or invalid');
    });
  });

  describe('getServerPublicKey', () => {
    it('should return the server public key', () => {
      const publicKey = strategy.getServerPublicKey();
      expect(publicKey).toBe(
        'GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q',
      );
    });
  });

  describe('generateRandomNonce', () => {
    it('should generate different nonces', async () => {
      const challenge1 = await strategy.generateChallenge(testClientPublicKey);
      const challenge2 = await strategy.generateChallenge(testClientPublicKey);

      expect(challenge1).not.toBe(challenge2);
    });

    it('should generate valid hex string', async () => {
      const challenge = await strategy.generateChallenge(testClientPublicKey);
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        challenge,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      const nonce = (transaction.operations[0] as any).value;
      expect(nonce).toMatch(/^[0-9a-f]{64}$/i); // 32 bytes = 64 hex chars
    });
  });
});
