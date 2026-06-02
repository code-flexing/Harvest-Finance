import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import { StellarService } from '../services/stellar.service';
import { SecretsService } from '../../common/secrets/secrets.service';
import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomLoggerService } from '../../logger/custom-logger.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fundTestnetAccount(publicKey: string): Promise<void> {
  const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
  if (!res.ok)
    throw new Error(`Friendbot failed for ${publicKey}: ${res.statusText}`);
  // Wait for ledger to close
  await new Promise((r) => setTimeout(r, 5000));
}

async function createFundedKeypair(): Promise<StellarSdk.Keypair> {
  const kp = StellarSdk.Keypair.random();
  await fundTestnetAccount(kp.publicKey());
  return kp;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('StellarService — Testnet Integration', () => {
  let service: StellarService;
  let platformKeypair: StellarSdk.Keypair;
  let farmerKeypair: StellarSdk.Keypair;
  let buyerKeypair: StellarSdk.Keypair;

  // Shared state across tests in this suite
  let createdEscrowBalanceId: string;
  let createdEscrowTxHash: string;

  // Increase timeout — testnet operations can be slow
  jest.setTimeout(60_000);

  beforeAll(async () => {
    console.log('🚀 Funding testnet accounts via Friendbot...');

    // Generate three fresh funded accounts for each role
    [platformKeypair, farmerKeypair, buyerKeypair] = await Promise.all([
      createFundedKeypair(),
      createFundedKeypair(),
      createFundedKeypair(),
    ]);

    console.log(`Platform: ${platformKeypair.publicKey()}`);
    console.log(`Farmer:   ${farmerKeypair.publicKey()}`);
    console.log(`Buyer:    ${buyerKeypair.publicKey()}`);

    // Bootstrap NestJS test module
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [
            () => ({
              STELLAR_NETWORK: 'testnet',
              STELLAR_PLATFORM_PUBLIC_KEY: platformKeypair.publicKey(),
              STELLAR_PLATFORM_SECRET_KEY: platformKeypair.secret(),
            }),
          ],
        }),
      ],
      providers: [
        StellarService,
        {
          provide: SecretsService,
          useValue: {
            getSecret: (key: string) =>
              Promise.resolve(platformKeypair.secret()),
          },
        },
        {
          provide: CustomLoggerService,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    await module.init();
    service = module.get<StellarService>(StellarService);
  });

  // ─── Connection ────────────────────────────────────────────────────────────

  describe('verifyConnection', () => {
    it('should confirm connection to Stellar testnet', async () => {
      const connected = await service.verifyConnection();
      expect(connected).toBe(true);
    });
  });

  // ─── Account Info ──────────────────────────────────────────────────────────

  describe('getAccountInfo', () => {
    it('should return account details for a funded account', async () => {
      const info = await service.getAccountInfo(platformKeypair.publicKey());
      expect(info.publicKey).toBe(platformKeypair.publicKey());
      expect(parseFloat(info.balance)).toBeGreaterThan(0);
      expect(info.sequence).toBeDefined();
    });

    it('should throw BadRequestException for an invalid public key', async () => {
      await expect(service.getAccountInfo('INVALID_KEY')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── Fee Estimation ────────────────────────────────────────────────────────

  describe('estimateFee', () => {
    it('should return a fee estimate with all required fields', async () => {
      const fee = await service.estimateFee(2);
      expect(fee.baseFee).toBeDefined();
      expect(fee.estimatedTotalFee).toBeDefined();
      expect(fee.feePerOperation).toBeDefined();
      expect(fee.currentNetworkFee).toBeGreaterThan(0);
    });
  });

  // ─── Escrow Creation ───────────────────────────────────────────────────────

  describe('createEscrow', () => {
    it('should create a claimable balance with valid parameters', async () => {
      const futureDeadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      const result = await service.createEscrow({
        farmerPublicKey: farmerKeypair.publicKey(),
        buyerPublicKey: buyerKeypair.publicKey(),
        amount: '10',
        deadlineUnixTimestamp: futureDeadline,
        orderId: `test-order-${Date.now()}`,
      });

      expect(result.balanceId).toBeDefined();
      expect(result.transactionHash).toBeDefined();
      expect(result.amount).toBe('10');
      expect(result.assetCode).toBe('XLM');
      expect(result.farmerPublicKey).toBe(farmerKeypair.publicKey());
      expect(result.buyerPublicKey).toBe(buyerKeypair.publicKey());

      // Save for payment release test
      createdEscrowBalanceId = result.balanceId;
      createdEscrowTxHash = result.transactionHash;

      console.log(`✅ Escrow created: ${createdEscrowBalanceId}`);
    });

    it('should throw BadRequestException when deadline is in the past', async () => {
      await expect(
        service.createEscrow({
          farmerPublicKey: farmerKeypair.publicKey(),
          buyerPublicKey: buyerKeypair.publicKey(),
          amount: '10',
          deadlineUnixTimestamp: Math.floor(Date.now() / 1000) - 100,
          orderId: 'test-past-deadline',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for an invalid farmer public key', async () => {
      await expect(
        service.createEscrow({
          farmerPublicKey: 'INVALID',
          buyerPublicKey: buyerKeypair.publicKey(),
          amount: '10',
          deadlineUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
          orderId: 'test-bad-key',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for amount of 0', async () => {
      await expect(
        service.createEscrow({
          farmerPublicKey: farmerKeypair.publicKey(),
          buyerPublicKey: buyerKeypair.publicKey(),
          amount: '0',
          deadlineUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
          orderId: 'test-zero-amount',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Claimable Balances Query ──────────────────────────────────────────────

  describe('getClaimableBalances', () => {
    it('should return at least the escrow we just created for the farmer', async () => {
      const balances = await service.getClaimableBalances(
        farmerKeypair.publicKey(),
      );
      expect(Array.isArray(balances)).toBe(true);
      const match = balances.find((b: any) => b.id === createdEscrowBalanceId);
      expect(match).toBeDefined();
    });

    it('should also appear for the buyer claimant', async () => {
      const balances = await service.getClaimableBalances(
        buyerKeypair.publicKey(),
      );
      const match = balances.find((b: any) => b.id === createdEscrowBalanceId);
      expect(match).toBeDefined();
    });
  });

  // ─── Transaction Status ───────────────────────────────────────────────────

  describe('getTransactionStatus', () => {
    it('should return success status for the escrow creation tx', async () => {
      const status = await service.getTransactionStatus(createdEscrowTxHash);
      expect(status.status).toBe('success');
      expect(status.transactionHash).toBe(createdEscrowTxHash);
      expect(status.ledger).toBeGreaterThan(0);
    });
  });

  // ─── Payment Release ───────────────────────────────────────────────────────

  describe('releasePayment', () => {
    it('should allow the farmer to claim the escrow balance', async () => {
      const result = await service.releasePayment({
        balanceId: createdEscrowBalanceId,
        farmerPublicKey: farmerKeypair.publicKey(),
        farmerSecretKey: farmerKeypair.secret(),
      });

      expect(result.status).toBe('success');
      expect(result.transactionHash).toBeDefined();
      console.log(`✅ Payment released: ${result.transactionHash}`);
    });

    it('should throw after the balance has already been claimed', async () => {
      await expect(
        service.releasePayment({
          balanceId: createdEscrowBalanceId,
          farmerPublicKey: farmerKeypair.publicKey(),
          farmerSecretKey: farmerKeypair.secret(),
        }),
      ).rejects.toThrow();
    });
  });

  // ─── Refund (Expired Escrow) ───────────────────────────────────────────────

  describe('refundEscrow', () => {
    let expiredEscrowId: string;

    beforeAll(async () => {
      const nearFutureDeadline = Math.floor(Date.now() / 1000) + 5; // 5 seconds

      const result = await service.createEscrow({
        farmerPublicKey: farmerKeypair.publicKey(),
        buyerPublicKey: buyerKeypair.publicKey(),
        amount: '5',
        deadlineUnixTimestamp: nearFutureDeadline,
        orderId: `refund-test-${Date.now()}`,
      });

      expiredEscrowId = result.balanceId;
      console.log(`⏳ Waiting 10s for escrow deadline to expire...`);
      await new Promise((r) => setTimeout(r, 10_000));
    });

    it('should allow the buyer to reclaim funds after the deadline', async () => {
      const result = await service.refundEscrow({
        balanceId: expiredEscrowId,
        buyerPublicKey: buyerKeypair.publicKey(),
        buyerSecretKey: buyerKeypair.secret(),
      });

      expect(result.status).toBe('success');
      expect(result.transactionHash).toBeDefined();
      console.log(`✅ Refund processed: ${result.transactionHash}`);
    });
  });

  // ─── Multi-Signature ───────────────────────────────────────────────────────

  describe('setupMultiSigAccount', () => {
    let multiSigKeypair: StellarSdk.Keypair;
    let cosignerKeypair: StellarSdk.Keypair;

    beforeAll(async () => {
      console.log('Funding multisig test accounts...');
      [multiSigKeypair, cosignerKeypair] = await Promise.all([
        createFundedKeypair(),
        createFundedKeypair(),
      ]);
    });

    it('should configure 2-of-2 multisig on a new account', async () => {
      const result = await service.setupMultiSigAccount({
        primaryPublicKey: multiSigKeypair.publicKey(),
        cosignerPublicKeys: [cosignerKeypair.publicKey()],
        threshold: 2,
        sourceSecretKey: multiSigKeypair.secret(),
      });

      expect(result.status).toBe('success');

      // Verify thresholds are applied on-chain
      const info = await service.getAccountInfo(multiSigKeypair.publicKey());
      expect(info.thresholds.med).toBe(2);
      expect(info.signers.length).toBeGreaterThanOrEqual(2);
    });

    it('should throw if threshold exceeds signer count', async () => {
      await expect(
        service.setupMultiSigAccount({
          primaryPublicKey: multiSigKeypair.publicKey(),
          cosignerPublicKeys: [cosignerKeypair.publicKey()],
          threshold: 5,
          sourceSecretKey: multiSigKeypair.secret(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
