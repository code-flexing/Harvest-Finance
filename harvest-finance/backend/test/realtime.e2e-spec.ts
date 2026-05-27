import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as socketIo from 'socket.io-client';
import { VaultGateway } from '../src/realtime/vault.gateway';
import { Repository } from 'typeorm';
import { Vault } from '../src/database/entities/vault.entity';
import { User } from '../src/database/entities/user.entity';
import { Deposit } from '../src/database/entities/deposit.entity';
import { Withdrawal } from '../src/database/entities/withdrawal.entity';
import { VaultsService } from '../src/vaults/vaults.service';
import { createConnection, getConnection } from 'typeorm';

describe('VaultActivity WebSocket (e2e)', () => {
  let app: INestApplication;
  let vaultsService: VaultsService;
  let vaultRepository: Repository<Vault>;
  let depositRepository: Repository<Deposit>;
  let withdrawalRepository: Repository<Withdrawal>;
  let server: any;
  let io: any;

  // Test data
  const testUserId = '11111111-1111-1111-1111-111111111111';
  const testVaultId = '22222222-2222-2222-2222-222222222222';
  const testSocketIoUrl = 'http://localhost:5000';

  beforeAll(async () => {
    // Create a clean database connection for testing
    await createConnection({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: 'harvest_finance_test',
      entities: [User, Vault, Deposit, Withdrawal],
      synchronize: true,
      dropSchema: true,
    });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Get services
    vaultsService = app.get(VaultsService);
    vaultRepository = app.get('VaultRepository');
    depositRepository = app.get('DepositRepository');
    withdrawalRepository = app.get('WithdrawalRepository');

    // Create test user and vault
    const user = new User();
    user.id = testUserId;
    user.email = 'test@test.com';
    user.password = 'hashedpassword';
    user.role = 'FARMER';
    user.isActive = true;
    await getConnection().manager.save(user);

    const vault = new Vault();
    vault.id = testVaultId;
    vault.ownerId = testUserId;
    vault.vaultName = 'Test Vault';
    vault.type = 'CROP_PRODUCTION';
    vault.status = 'ACTIVE';
    vault.totalDeposits = 0;
    vault.maxCapacity = 10000;
    vault.interestRate = 0.08;
    vault.isPublic = true;
    await vaultRepository.save(vault);

    // Get HTTP server to extract the socket.io server instance
    const httpServer = app.getHttpServer();
    // In NestJS with IoAdapter, the socket.io server is attached to the httpServer
    // We need to access it via the adapter
    const ioAdapter = app.getHttpAdapter().getWsAdapter() as any;
    server = ioAdapter?.server;
  });

  afterAll(async () => {
    await app.close();
    await getConnection().close();
  });

  describe('VaultGateway', () => {
    it('should emit deposit event and receive via socket', async () => {
      // Create a socket client with auth token (mock JWT generation in real app)
      const token = 'fake-jwt-token'; // In real scenario, this would be validated
      const client = socketIo(testSocketIoUrl + '/vault-activity', {
        auth: { token },
        transports: ['websocket'],
      });

      const promises: Promise<unknown>[] = [];

      promises.push(
        new Promise<void>((resolve, reject) => {
          client.on('connect', () => {
            resolve();
          });
          client.on('connect_error', (err: Error) => {
            reject(err);
          });
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        }),
      );

      // Wait for connection
      await Promise.race(promises);

      // Subscribe to vault
      client.emit('subscribe:vault', testVaultId);

      // Wait for subscription confirmation
      await new Promise<void>((resolve) => {
        client.on('subscribed:vault', (data: { vaultId: string }) => {
          expect(data.vaultId).toBe(testVaultId);
          resolve();
        });
      });

      // Listen for activity events
      const activityPromise = new Promise<VaultActivityEvent>((resolve) => {
        client.on('vault:activity', (event: VaultActivityEvent) => {
          resolve(event);
        });
      });

      // Trigger a deposit via service
      // Note: This would normally require valid JWT, but we can call service directly for testing
      // The gateway should emit regardless
      const depositDto = {
        userId: testUserId,
        amount: 100,
      };

      // Call deposit service (this will emit event)
      // We need to handle the blockchain confirmation mock delay
      await vaultsService.depositToVault(testVaultId, depositDto as any);

      // Check that event was received
      const receivedEvent = await Promise.race([
        activityPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Event timeout')), 5000),
        ),
      ]);

      expect(receivedEvent.type).toBe('deposit');
      expect(receivedEvent.vaultId).toBe(testVaultId);
      expect(receivedEvent.amount).toBe(100);
      expect(receivedEvent.userId).toBe(testUserId);

      client.disconnect();
    }).timeout(10000);

    it('should emit harvest event when rewards are claimed', async () => {
      // Create a vault with some deposits first
      const deposit = new Deposit();
      deposit.id = 'deposit-1';
      deposit.userId = testUserId;
      deposit.vaultId = testVaultId;
      deposit.amount = 500;
      deposit.status = 'CONFIRMED';
      deposit.confirmedAt = new Date();
      await depositRepository.save(deposit);

      // Connect client
      const client = socketIo(testSocketIoUrl + '/vault-activity', {
        auth: { token: 'fake-jwt' },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        client.on('connect', resolve);
      });

      client.emit('subscribe:vault', testVaultId);

      await new Promise<void>((resolve) => {
        client.on('subscribed:vault', () => resolve());
      });

      const activityPromise = new Promise<VaultActivityEvent>((resolve) => {
        client.on('vault:activity', (event: VaultActivityEvent) => {
          if (event.type === 'harvest') {
            resolve(event);
          }
        });
      });

      // Claim rewards
      await vaultsService.claimRewards(testUserId, testVaultId);

      const receivedEvent = await Promise.race([
        activityPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Event timeout')), 5000),
        ),
      ]);

      expect(receivedEvent.type).toBe('harvest');
      expect(receivedEvent.vaultId).toBe(testVaultId);
      expect(receivedEvent.userId).toBe(testUserId);
      expect(receivedEvent.amount).toBeGreaterThan(0);

      client.disconnect();
    }).timeout(10000);
  });
});
