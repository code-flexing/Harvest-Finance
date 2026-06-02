import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StellarStrategy } from './stellar.strategy';
import { User, UserRole } from '../../database/entities/user.entity';
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
    'SAKIA7YOPW5G2SSLLGEELDJ7SZPOS6X4GZWKOQYYUY7IL6FI6N7WP6RE';
  const testServerPublicKey =
    'GB26SVHUCWUATM5KXLYXD4TSLY7HP62RJYUMV5A7UZYY3QIRWY62XVEB';
  const testNetworkPassphrase = 'Test SDF Network ; September 2015';
  const testClientKeypair = StellarSdk.Keypair.random();
  const testClientPublicKey = testClientKeypair.publicKey();

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
      ).toThrow(
        'Missing required environment variable: STELLAR_SERVER_SECRET. ' +
          'Please define it in your .env file before starting the server.',
      );
    });

    it('should use testnet network by default', () => {
      expect(strategy).toBeDefined();
      const publicKey = strategy.getServerPublicKey();
      expect(publicKey).toBe(
        StellarSdk.Keypair.fromSecret(testServerSecret).publicKey(),
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

      // transaction source is server account
      const serverPublicKey =
        StellarSdk.Keypair.fromSecret(testServerSecret).publicKey();
      expect(transaction.source).toBe(serverPublicKey);
      // operation source should be client
      expect((transaction.operations[0] as any).source).toBe(
        testClientPublicKey,
      );
      // SDK may normalize sequence to '1' or leave as '0' depending on version
      expect(['0', '1']).toContain(transaction.sequence);
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
        email: '',
        password: '',
        role: UserRole.FARMER,
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
      const clientKeypair = testClientKeypair;
      transaction.sign(clientKeypair);

      const result = await strategy.validate(
        transaction.toEnvelope().toXDR('base64'),
      );

      expect(result).toBeDefined();
      expect(result.stellarAddress).toBe(testClientPublicKey);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { stellarAddress: testClientPublicKey },
      });
      expect(userRepository.create).toHaveBeenCalledWith({
        stellarAddress: testClientPublicKey,
        email: '',
        password: '',
        role: UserRole.FARMER,
        firstName: 'Stellar',
        lastName: 'User',
        isActive: true,
      });
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

      const clientKeypair = testClientKeypair;
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

      const clientKeypair = testClientKeypair;
      transaction.sign(clientKeypair);

      await expect(
        strategy.validate(transaction.toEnvelope().toXDR('base64')),
      ).rejects.toThrow('User account is deactivated');
    });

    it('should throw error for invalid source account', async () => {
      // Build a new transaction with invalid source account
      const invalidServerPub = StellarSdk.Keypair.random().publicKey();
      const serverAccountInvalid = new StellarSdk.Account(
        invalidServerPub,
        '0',
      );
      const txInvalidSource = new StellarSdk.TransactionBuilder(
        serverAccountInvalid,
        {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: testNetworkPassphrase,
          timebounds: {
            minTime: '0',
            maxTime: (Math.floor(Date.now() / 1000) + 300).toString(),
          },
        },
      )
        .addOperation(
          StellarSdk.Operation.manageData({
            source: testClientPublicKey,
            name: 'Harvest Finance auth',
            value: Buffer.from('00'.repeat(32), 'hex'),
          }),
        )
        .build();

      // Sign with client and server keypairs
      const clientKeypair = testClientKeypair;
      txInvalidSource.sign(clientKeypair);

      await expect(
        strategy.validate(txInvalidSource.toEnvelope().toXDR('base64')),
      ).rejects.toThrow('Invalid source account');
    });

    it('should throw error for invalid sequence number', async () => {
      // Build a new transaction with sequence '1'
      const serverAccountSeq = new StellarSdk.Account(
        StellarSdk.Keypair.fromSecret(testServerSecret).publicKey(),
        '1',
      );
      const txInvalidSeq = new StellarSdk.TransactionBuilder(serverAccountSeq, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: testNetworkPassphrase,
        timebounds: {
          minTime: '0',
          maxTime: (Math.floor(Date.now() / 1000) + 300).toString(),
        },
      })
        .addOperation(
          StellarSdk.Operation.manageData({
            source: testClientPublicKey,
            name: 'Harvest Finance auth',
            value: Buffer.from('00'.repeat(32), 'hex'),
          }),
        )
        .build();

      // Sign with server and client
      const serverKeypair = StellarSdk.Keypair.fromSecret(testServerSecret);
      const clientKeypair = testClientKeypair;
      txInvalidSeq.sign(serverKeypair);
      txInvalidSeq.sign(clientKeypair);

      await expect(
        strategy.validate(txInvalidSeq.toEnvelope().toXDR('base64')),
      ).rejects.toThrow('Invalid sequence number');
    });

    it('should throw error for expired transaction', async () => {
      // Build a new expired transaction
      const serverAccount = new StellarSdk.Account(
        StellarSdk.Keypair.fromSecret(testServerSecret).publicKey(),
        '0',
      );
      const pastTime = Math.floor(Date.now() / 1000) - 1000;
      const txExpired = new StellarSdk.TransactionBuilder(serverAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: testNetworkPassphrase,
        timebounds: {
          minTime: (pastTime - 300).toString(),
          maxTime: pastTime.toString(),
        },
      })
        .addOperation(
          StellarSdk.Operation.manageData({
            source: testClientPublicKey,
            name: 'Harvest Finance auth',
            value: Buffer.from('00'.repeat(32), 'hex'),
          }),
        )
        .build();

      const serverKeypair = StellarSdk.Keypair.fromSecret(testServerSecret);
      const clientKeypair = testClientKeypair;
      txExpired.sign(serverKeypair);
      txExpired.sign(clientKeypair);

      expect(() =>
        (strategy as any).validateTransactionStructure({
          source: testServerPublicKey,
          sequence: '0',
          timeBounds: {
            minTime: (pastTime - 300).toString(),
            maxTime: pastTime.toString(),
          },
          operations: [validManageDataOperation()],
        }),
      ).toThrow('Challenge transaction expired');
    });

    it('should throw error for invalid operation type', async () => {
      // Build a transaction with a payment operation
      const serverAccount = new StellarSdk.Account(
        StellarSdk.Keypair.fromSecret(testServerSecret).publicKey(),
        '0',
      );
      const txPayment = new StellarSdk.TransactionBuilder(serverAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: testNetworkPassphrase,
        timebounds: {
          minTime: '0',
          maxTime: (Math.floor(Date.now() / 1000) + 300).toString(),
        },
      })
        .addOperation(
          StellarSdk.Operation.payment({
            source: testClientPublicKey,
            destination: testClientPublicKey,
            asset: StellarSdk.Asset.native(),
            amount: '1',
          }),
        )
        .build();

      const serverKeypair = StellarSdk.Keypair.fromSecret(testServerSecret);
      const clientKeypair = testClientKeypair;
      txPayment.sign(serverKeypair);
      txPayment.sign(clientKeypair);

      await expect(
        strategy.validate(txPayment.toEnvelope().toXDR('base64')),
      ).rejects.toThrow('Invalid operation type');
    });

    it('should throw error for missing server signature', async () => {
      // Build a valid transaction but only sign with client
      const serverAccount = new StellarSdk.Account(
        StellarSdk.Keypair.fromSecret(testServerSecret).publicKey(),
        '0',
      );
      const tx = new StellarSdk.TransactionBuilder(serverAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: testNetworkPassphrase,
        timebounds: {
          minTime: '0',
          maxTime: (Math.floor(Date.now() / 1000) + 300).toString(),
        },
      })
        .addOperation(
          StellarSdk.Operation.manageData({
            source: testClientPublicKey,
            name: 'Harvest Finance auth',
            value: Buffer.from('00'.repeat(32), 'hex'),
          }),
        )
        .build();

      const clientKeypair = testClientKeypair;
      tx.sign(clientKeypair);

      await expect(
        strategy.validate(tx.toEnvelope().toXDR('base64')),
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
        StellarSdk.Keypair.fromSecret(testServerSecret).publicKey(),
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

      let nonce = (transaction.operations[0] as any).value;
      if (Buffer.isBuffer(nonce) || nonce?.type === 'Buffer') {
        // convert Node Buffer or XDR buffer object to hex
        if (nonce.type === 'Buffer' && Array.isArray(nonce.data)) {
          nonce = Buffer.from(nonce.data).toString('hex');
        } else {
          nonce = Buffer.isBuffer(nonce)
            ? nonce.toString('hex')
            : String(nonce);
        }
      }
      expect(nonce).toMatch(/^[0-9a-f]{64}$/i); // 32 bytes = 64 hex chars
    });
  });
});

function currentTimeBounds() {
  const now = Math.floor(Date.now() / 1000);
  return {
    minTime: now.toString(),
    maxTime: (now + 300).toString(),
  };
}

function validManageDataOperation() {
  return {
    type: 'manageData',
    name: 'Harvest Finance auth',
  };
}
