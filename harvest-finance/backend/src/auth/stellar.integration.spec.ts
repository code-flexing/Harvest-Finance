import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { StellarStrategy } from './strategies/stellar.strategy';
import { User } from '../database/entities/user.entity';
import * as StellarSdk from '@stellar/stellar-sdk';
import { StellarChallengeDto, StellarVerifyDto } from './dto/stellar-auth.dto';

describe('Stellar Authentication Integration', () => {
  let module: TestingModule;
  let authController: AuthController;
  let stellarStrategy: StellarStrategy;
  let userRepository: jest.Mocked<Repository<User>>;

  const testServerSecret =
    'SBX7SARQOFS6IM2HS2N5TVK54AEF55E3FHOXBTWA6IPEEJJ4W5WJWE6W';
  const testNetworkPassphrase = 'Test SDF Network ; September 2015';
  const testClientSecret =
    'SCZANGBAZEY5BOOEO6SCKZ3SPNGE6US4QOANF3XRGA4Q2BMVIQZB4H7Q';
  const testClientPublicKey =
    'GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q';

  beforeAll(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
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
      }),
    };

    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockAuthService = {
      generateTokens: jest.fn(),
    };

    module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        StellarStrategy,
        AuthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    })
      .overrideProvider(AuthService)
      .useValue(mockAuthService)
      .compile();

    authController = module.get<AuthController>(AuthController);
    stellarStrategy = module.get<StellarStrategy>(StellarStrategy);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Authentication Flow', () => {
    it('should authenticate user with valid Stellar signature', async () => {
      // Step 1: Generate challenge
      const challengeDto: StellarChallengeDto = {
        public_key: testClientPublicKey,
      };

      const challengeResponse =
        await authController.generateStellarChallenge(challengeDto);

      expect(challengeResponse).toHaveProperty('server_public_key');
      expect(challengeResponse).toHaveProperty('transaction');
      expect(challengeResponse).toHaveProperty('network_passphrase');
      expect(challengeResponse.server_public_key).toBe(
        'GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q',
      );
      expect(challengeResponse.network_passphrase).toBe(testNetworkPassphrase);

      // Step 2: Parse and sign transaction (client side simulation)
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        challengeResponse.transaction,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      // Verify transaction structure
      expect(transaction.source).toBe(
        'GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q',
      );
      expect(transaction.sequence).toBe('0');
      expect(transaction.operations.length).toBe(1);
      expect(transaction.operations[0].type).toBe('manageData');
      expect(transaction.operations[0].name).toBe('Harvest Finance auth');
      expect(transaction.signatures.length).toBe(1); // Server signature

      // Sign with client key
      const clientKeypair = StellarSdk.Keypair.fromSecret(testClientSecret);
      transaction.sign(clientKeypair);

      // Step 3: Verify signed transaction
      const verifyDto: StellarVerifyDto = {
        transaction: transaction.toEnvelope().toXDR('base64'),
      };

      // Mock user repository for new user creation
      userRepository.findOne.mockResolvedValueOnce(null);
      const newUser = {
        id: 'new-user-id',
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

      // Mock token generation
      const mockTokens = {
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
      };
      const authService = module.get<AuthService>(AuthService);
      (authService.generateTokens as jest.Mock).mockResolvedValue(mockTokens);

      const authResponse = await authController.verifyStellarAuth(verifyDto);

      // Verify authentication response
      expect(authResponse).toHaveProperty('access_token', 'test_access_token');
      expect(authResponse).toHaveProperty(
        'refresh_token',
        'test_refresh_token',
      );
      expect(authResponse).toHaveProperty('user');
      expect(authResponse.user.stellar_address).toBe(testClientPublicKey);
      expect(authResponse.user.role).toBe('USER');
      expect(authResponse.user.full_name).toBe('Stellar User');

      // Verify user was created
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { stellarAddress: testClientPublicKey },
      });
      expect(userRepository.create).toHaveBeenCalledWith({
        stellarAddress: testClientPublicKey,
        email: null,
        password: null,
        role: 'USER',
        firstName: 'Stellar',
        lastName: 'User',
        isActive: true,
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(userRepository.update).toHaveBeenCalledWith(newUser.id, {
        lastLogin: expect.any(Date),
      });
    });

    it('should authenticate existing user', async () => {
      // Step 1: Generate challenge
      const challengeDto: StellarChallengeDto = {
        public_key: testClientPublicKey,
      };

      const challengeResponse =
        await authController.generateStellarChallenge(challengeDto);

      // Step 2: Parse and sign transaction
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        challengeResponse.transaction,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      const clientKeypair = StellarSdk.Keypair.fromSecret(testClientSecret);
      transaction.sign(clientKeypair);

      // Step 3: Verify with existing user
      const verifyDto: StellarVerifyDto = {
        transaction: transaction.toEnvelope().toXDR('base64'),
      };

      // Mock existing user
      const existingUser = {
        id: 'existing-user-id',
        stellarAddress: testClientPublicKey,
        email: 'existing@example.com',
        password: 'hashed_password',
        role: 'ADMIN',
        firstName: 'Existing',
        lastName: 'User',
        isActive: true,
        lastLogin: new Date(),
      };
      userRepository.findOne.mockResolvedValueOnce(existingUser as any);
      userRepository.update.mockResolvedValueOnce(undefined);

      // Mock token generation
      const mockTokens = {
        accessToken: 'existing_user_token',
        refreshToken: 'existing_user_refresh',
      };
      const authService = module.get<AuthService>(AuthService);
      (authService.generateTokens as jest.Mock).mockResolvedValue(mockTokens);

      const authResponse = await authController.verifyStellarAuth(verifyDto);

      // Verify authentication response
      expect(authResponse.user.id).toBe('existing-user-id');
      expect(authResponse.user.role).toBe('ADMIN');
      expect(authResponse.user.full_name).toBe('Existing User');

      // Verify user was not created again
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(userRepository.update).toHaveBeenCalledWith(existingUser.id, {
        lastLogin: expect.any(Date),
      });
    });

    it('should reject authentication for inactive user', async () => {
      // Step 1: Generate challenge
      const challengeDto: StellarChallengeDto = {
        public_key: testClientPublicKey,
      };

      const challengeResponse =
        await authController.generateStellarChallenge(challengeDto);

      // Step 2: Parse and sign transaction
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        challengeResponse.transaction,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      const clientKeypair = StellarSdk.Keypair.fromSecret(testClientSecret);
      transaction.sign(clientKeypair);

      // Step 3: Verify with inactive user
      const verifyDto: StellarVerifyDto = {
        transaction: transaction.toEnvelope().toXDR('base64'),
      };

      // Mock inactive user
      const inactiveUser = {
        id: 'inactive-user-id',
        stellarAddress: testClientPublicKey,
        isActive: false,
      };
      userRepository.findOne.mockResolvedValueOnce(inactiveUser as any);

      await expect(authController.verifyStellarAuth(verifyDto)).rejects.toThrow(
        'User account is deactivated',
      );
    });

    it('should reject authentication with invalid signature', async () => {
      // Step 1: Generate challenge
      const challengeDto: StellarChallengeDto = {
        public_key: testClientPublicKey,
      };

      const challengeResponse =
        await authController.generateStellarChallenge(challengeDto);

      // Step 2: Parse transaction but don't sign with client key
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        challengeResponse.transaction,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      // Only server signature present, no client signature
      const verifyDto: StellarVerifyDto = {
        transaction: transaction.toEnvelope().toXDR('base64'),
      };

      await expect(authController.verifyStellarAuth(verifyDto)).rejects.toThrow(
        'Client signature missing or invalid',
      );
    });

    it('should reject authentication with expired challenge', async () => {
      // Generate challenge
      const challengeDto: StellarChallengeDto = {
        public_key: testClientPublicKey,
      };

      const challengeResponse =
        await authController.generateStellarChallenge(challengeDto);

      // Parse transaction and modify time bounds to be expired
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        challengeResponse.transaction,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      // Set expired time bounds
      const pastTime = Math.floor(Date.now() / 1000) - 1000;
      (transaction as any).timeBounds = {
        minTime: (pastTime - 300).toString(),
        maxTime: pastTime.toString(),
      };

      const clientKeypair = StellarSdk.Keypair.fromSecret(testClientSecret);
      transaction.sign(clientKeypair);

      const verifyDto: StellarVerifyDto = {
        transaction: transaction.toEnvelope().toXDR('base64'),
      };

      await expect(authController.verifyStellarAuth(verifyDto)).rejects.toThrow(
        'Challenge transaction expired',
      );
    });
  });

  describe('Challenge Generation Edge Cases', () => {
    it('should reject invalid public key format', async () => {
      const challengeDto: StellarChallengeDto = {
        public_key: 'invalid_key_format',
      };

      await expect(
        authController.generateStellarChallenge(challengeDto),
      ).rejects.toThrow();
    });

    it('should generate unique challenges for each request', async () => {
      const challengeDto: StellarChallengeDto = {
        public_key: testClientPublicKey,
      };

      const challenge1 =
        await authController.generateStellarChallenge(challengeDto);
      const challenge2 =
        await authController.generateStellarChallenge(challengeDto);

      expect(challenge1.transaction).not.toBe(challenge2.transaction);

      // Both should be valid XDR
      const tx1 = StellarSdk.TransactionBuilder.fromXDR(
        challenge1.transaction,
        testNetworkPassphrase,
      );
      const tx2 = StellarSdk.TransactionBuilder.fromXDR(
        challenge2.transaction,
        testNetworkPassphrase,
      );

      expect(tx1).toBeDefined();
      expect(tx2).toBeDefined();
    });

    it('should set proper time bounds for challenges', async () => {
      const challengeDto: StellarChallengeDto = {
        public_key: testClientPublicKey,
      };

      const challengeResponse =
        await authController.generateStellarChallenge(challengeDto);
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        challengeResponse.transaction,
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

  describe('Security Validation', () => {
    it('should validate server signature in challenge', async () => {
      const challengeDto: StellarChallengeDto = {
        public_key: testClientPublicKey,
      };

      const challengeResponse =
        await authController.generateStellarChallenge(challengeDto);
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        challengeResponse.transaction,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      // Verify server signature
      const hash = transaction.hash();
      const serverKeypair = StellarSdk.Keypair.fromSecret(testServerSecret);
      const serverSignature = transaction.signatures.find((sig) => {
        try {
          return serverKeypair.verify(hash, sig.signature());
        } catch {
          return false;
        }
      });

      expect(serverSignature).toBeDefined();
    });

    it('should prevent transaction execution with sequence 0', async () => {
      const challengeDto: StellarChallengeDto = {
        public_key: testClientPublicKey,
      };

      const challengeResponse =
        await authController.generateStellarChallenge(challengeDto);
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        challengeResponse.transaction,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      expect(transaction.sequence).toBe('0');
    });

    it('should include proper operation name', async () => {
      const challengeDto: StellarChallengeDto = {
        public_key: testClientPublicKey,
      };

      const challengeResponse =
        await authController.generateStellarChallenge(challengeDto);
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        challengeResponse.transaction,
        testNetworkPassphrase,
      ) as StellarSdk.Transaction;

      expect(transaction.operations[0].name).toBe('Harvest Finance auth');
    });
  });
});
