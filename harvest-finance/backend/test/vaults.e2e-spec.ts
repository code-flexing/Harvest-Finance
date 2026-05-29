import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from '../src/database/entities/user.entity';
import {
  Vault,
  VaultStatus,
  VaultType,
} from '../src/database/entities/vault.entity';
import { Deposit } from '../src/database/entities/deposit.entity';
import { Withdrawal } from '../src/database/entities/withdrawal.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

describe('Vault Flows Integration (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let vaultRepository: Repository<Vault>;
  let depositRepository: Repository<Deposit>;
  let withdrawalRepository: Repository<Withdrawal>;

  let testUser: User;
  let accessToken: string;
  let activeVault: Vault;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    userRepository = app.get(getRepositoryToken(User));
    vaultRepository = app.get(getRepositoryToken(Vault));
    depositRepository = app.get(getRepositoryToken(Deposit));
    withdrawalRepository = app.get(getRepositoryToken(Withdrawal));

    // Setup Test User
    const rawPassword = 'SecurePass123!';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    testUser = userRepository.create({
      email: `vault_tester_${Date.now()}@example.com`,
      password: hashedPassword,
      role: UserRole.FARMER,
      firstName: 'Vault',
      lastName: 'Tester',
      isActive: true,
    });
    await userRepository.save(testUser);

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: rawPassword,
      });
    accessToken = loginResponse.body.access_token;

    // Setup Active Vault
    activeVault = vaultRepository.create({
      ownerId: testUser.id,
      type: VaultType.CROP_PRODUCTION,
      status: VaultStatus.ACTIVE,
      vaultName: 'Test Active Vault',
      description: 'A vault for integration testing',
      symbol: 'TEST',
      assetPair: 'XLM/USDC',
      maxCapacity: 10000,
      interestRate: 5,
      isPublic: true,
    });
    await vaultRepository.save(activeVault);
  });

  afterAll(async () => {
    // Cleanup
    await depositRepository.delete({ userId: testUser.id });
    await withdrawalRepository.delete({ userId: testUser.id });
    await vaultRepository.delete({ id: activeVault.id });
    await userRepository.delete({ id: testUser.id });
    await app.close();
  });

  describe('Deposit flow integration', () => {
    it('1. Successful Deposit', async () => {
      const depositPayload = {
        amount: 500,
        idempotencyKey: `dep_1_${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/vaults/${activeVault.id}/deposit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(depositPayload)
        .expect(200);

      expect(response.body).toHaveProperty('deposit');
      expect(response.body.deposit).toHaveProperty('status', 'CONFIRMED');
      expect(response.body.deposit.amount).toBe(500);

      expect(response.body).toHaveProperty('vault');
      expect(response.body.vault.totalDeposits).toBeGreaterThanOrEqual(500);

      // Verify DB state
      const dbDeposit = await depositRepository.findOne({
        where: { id: response.body.deposit.id },
      });
      expect(dbDeposit).toBeDefined();
      expect(dbDeposit?.status).toBe('CONFIRMED');
    });

    it('2. Duplicate Idempotency Key', async () => {
      const idempotencyKey = `dep_dup_${Date.now()}`;
      const depositPayload = {
        amount: 300,
        idempotencyKey,
      };

      // First deposit
      const firstResponse = await request(app.getHttpServer())
        .post(`/api/v1/vaults/${activeVault.id}/deposit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(depositPayload)
        .expect(200);

      // Second deposit with same idempotency key
      const secondResponse = await request(app.getHttpServer())
        .post(`/api/v1/vaults/${activeVault.id}/deposit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(depositPayload)
        .expect(200);

      // Verify same deposit is returned
      expect(firstResponse.body.deposit.id).toBe(
        secondResponse.body.deposit.id,
      );

      // Verify DB state - only one deposit should exist with this key
      const deposits = await depositRepository.find({
        where: { idempotencyKey, userId: testUser.id },
      });
      expect(deposits.length).toBe(1);
    });

    it('3. Capacity Exceeded', async () => {
      const depositPayload = {
        amount: 20000, // Exceeds maxCapacity of 10000
        idempotencyKey: `dep_cap_${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/vaults/${activeVault.id}/deposit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(depositPayload)
        .expect(400);

      expect(response.body.message).toContain(
        'Deposit amount exceeds available vault capacity',
      );

      // Verify DB state - no invalid deposit persisted
      const deposits = await depositRepository.find({
        where: { idempotencyKey: depositPayload.idempotencyKey },
      });
      expect(deposits.length).toBe(0);
    });
  });

  describe('Withdrawal flow integration', () => {
    it('1. Successful Withdrawal (Sufficient Balance)', async () => {
      const withdrawalPayload = {
        amount: 200,
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/vaults/${activeVault.id}/withdraw`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(withdrawalPayload)
        .expect(200);

      expect(response.body).toHaveProperty('withdrawal');
      expect(response.body.withdrawal).toHaveProperty('status', 'CONFIRMED');
      expect(response.body.withdrawal.amount).toBe('200'); // typeorm decimal is string

      // Verify DB state
      const dbWithdrawal = await withdrawalRepository.findOne({
        where: { id: response.body.withdrawal.id },
      });
      expect(dbWithdrawal).toBeDefined();
      expect(dbWithdrawal?.status).toBe('CONFIRMED');
    });

    it('2. Insufficient Balance', async () => {
      const withdrawalPayload = {
        amount: 50000, // More than what user has deposited
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/vaults/${activeVault.id}/withdraw`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(withdrawalPayload)
        .expect(400);

      expect(response.body.message).toBe('Insufficient balance for withdrawal');
    });

    it('3. Vault Paused Scenario', async () => {
      // First, create a frozen vault
      const frozenVault = vaultRepository.create({
        ownerId: testUser.id,
        type: VaultType.CROP_PRODUCTION,
        status: VaultStatus.FROZEN,
        vaultName: 'Test Frozen Vault',
        description: 'A frozen vault for testing',
        symbol: 'TEST-FRZ',
        assetPair: 'XLM/USDC',
        maxCapacity: 10000,
        interestRate: 5,
        isPublic: true,
      });
      await vaultRepository.save(frozenVault);

      const withdrawalPayload = {
        amount: 100,
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/vaults/${frozenVault.id}/withdraw`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(withdrawalPayload)
        .expect(400);

      expect(response.body.message).toBe(
        'Vault is frozen. Withdrawals are blocked.',
      );

      // Cleanup
      await vaultRepository.delete({ id: frozenVault.id });
    });
  });
});
