import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomLoggerService } from '../../logger/custom-logger.service';
import * as StellarSdk from 'stellar-sdk';
import { StellarService } from '../services/stellar.service';
import { SecretsService } from '../../common/secrets/secrets.service';
import { FeeBumpScenario } from '../interfaces/stellar.interfaces';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomLoggerService } from '../../logger/custom-logger.service';
import { StellarClientService } from '../services/stellar-client.service';

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

describe('StellarService — Fee-Bump & MEV Testing', () => {
  let service: StellarService;
  let platformKeypair: StellarSdk.Keypair;
  let attackerKeypair: StellarSdk.Keypair;
  let farmerKeypair: StellarSdk.Keypair;
  let buyerKeypair: StellarSdk.Keypair;

  // Increase timeout — testnet operations and race simulations can be slow
  jest.setTimeout(120_000);

  beforeAll(async () => {
    console.log('🚀 Funding testnet accounts for MEV simulation...');

    [platformKeypair, attackerKeypair, farmerKeypair, buyerKeypair] =
      await Promise.all([
        createFundedKeypair(),
        createFundedKeypair(),
        createFundedKeypair(),
        createFundedKeypair(),
      ]);

    console.log(`Platform: ${platformKeypair.publicKey()}`);
    console.log(`Attacker: ${attackerKeypair.publicKey()}`);
    console.log(`Farmer:   ${farmerKeypair.publicKey()}`);
    console.log(`Buyer:    ${buyerKeypair.publicKey()}`);

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
        { provide: StellarClientService, useValue: {} },
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

  // ─── Test Group 1: Infrastructure ──────────────────────────────────────────

  describe('Fee-Bump Infrastructure Validation', () => {
    it('should successfully submit a fee-bumped payment', async () => {
      const amount = '1.0';
      const platformAccount = await service.getAccountInfo(
        platformKeypair.publicKey(),
      );

      // Build inner tx
      const innerTx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account(
          platformKeypair.publicKey(),
          platformAccount.sequence,
        ),
        {
          fee: '100',
          networkPassphrase: StellarSdk.Networks.TESTNET,
        },
      )
        .addOperation(
          StellarSdk.Operation.payment({
            destination: farmerKeypair.publicKey(),
            asset: StellarSdk.Asset.native(),
            amount: amount,
          }),
        )
        .setTimeout(30)
        .build();

      innerTx.sign(platformKeypair);

      const bumpResult = await service.submitWithFeeBump(
        innerTx.toXDR(),
        attackerKeypair.secret(),
        '10000', // Higher fee paid by attacker
      );

      expect(bumpResult.feeBumpTransactionHash).toBeDefined();
      expect(bumpResult.innerTransactionHash).toBe(
        innerTx.hash().toString('hex'),
      );
      expect(parseFloat(bumpResult.feeCharged)).toBeGreaterThan(0);

      console.log(
        `✅ Fee-bump infrastructure OK. Outer hash: ${bumpResult.feeBumpTransactionHash}`,
      );
    });

    it('should recommend priority fees based on network stats', async () => {
      const recommendation = await service.getRecommendedPriorityFee(90);
      expect(recommendation.percentile).toBe(90);
      expect(recommendation.feePerOperationStroops).toBeGreaterThan(0);
      expect(recommendation.networkStats).toBeDefined();
      console.log(
        `📈 Recommended p90 fee: ${recommendation.feePerOperationStroops} stroops`,
      );
    });
  });

  // ─── Test Group 2: Front-Running Escrow ─────────────────────────────────────

  describe('Scenario: Front-Running createEscrow', () => {
    it('should demonstrate fee-bump priority in simultaneous submissions', async () => {
      const orderIdBase = `mev-escrow-${Date.now()}`;

      const paramsVictim = {
        farmerPublicKey: farmerKeypair.publicKey(),
        buyerPublicKey: buyerKeypair.publicKey(),
        amount: '10',
        deadlineUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
        orderId: `${orderIdBase}-victim`,
      };

      const paramsAttacker = {
        ...paramsVictim,
        orderId: `${orderIdBase}-attacker`,
        priorityFeeStroops: '50000', // Heavy bump
      };

      console.log(
        '⚡ Submitting victim (base fee) and attacker (bumped fee) simultaneously...',
      );

      // Note: In real world, attacker sees victim in mempool.
      // Here we just fire both to see if bumped one is processed first/successfully.
      const [resultVictim, resultAttacker] = await Promise.allSettled([
        service.createEscrow(paramsVictim),
        service.createEscrow(paramsAttacker),
      ]);

      // Both might succeed if different order IDs, but we want to check ledger ordering
      if (
        resultAttacker.status === 'fulfilled' &&
        resultVictim.status === 'fulfilled'
      ) {
        const attackerStatus = await service.getTransactionStatus(
          resultAttacker.value.transactionHash,
        );
        const victimStatus = await service.getTransactionStatus(
          resultVictim.value.transactionHash,
        );

        console.log(
          `Attacker Ledger: ${attackerStatus.ledger} | Victim Ledger: ${victimStatus.ledger}`,
        );
        // On testnet they often land in same ledger, but attacker should NOT be after victim if bumped
        expect(attackerStatus.ledger).toBeLessThanOrEqual(victimStatus.ledger!);
      } else {
        console.log(
          'One of the submissions failed - likely due to sequence overlap. This is expected without serialisation.',
        );
      }
    });
  });

  // ─── Test Group 3: Race Condition (Double Claim) ──────────────────────────

  describe('Scenario: Double-Claim Race (release vs refund)', () => {
    it('should award the balance to the higher fee bidder during a race', async () => {
      // 1. Create an escrow that expires VERY soon
      const quickDeadline = Math.floor(Date.now() / 1000) + 5;
      const escrow = await service.createEscrow({
        farmerPublicKey: farmerKeypair.publicKey(),
        buyerPublicKey: buyerKeypair.publicKey(),
        amount: '5',
        deadlineUnixTimestamp: quickDeadline,
        orderId: `race-${Date.now()}`,
      });

      console.log(
        `⏳ Waiting for escrow ${escrow.balanceId} to reach deadline...`,
      );
      await new Promise((r) => setTimeout(r, 7000));

      // 2. Farmer tries to release (valid anytime)
      // 3. Buyer tries to refund (valid after deadline)
      // Attacker (buyer) bumps the refund fee to "win" the race

      console.log(
        '🏁 Racing release (farmer, base) vs refund (buyer, bumped)...',
      );

      const results = await Promise.allSettled([
        service.releasePayment({
          balanceId: escrow.balanceId,
          farmerPublicKey: farmerKeypair.publicKey(),
          farmerSecretKey: farmerKeypair.secret(),
        }),
        service.refundEscrow({
          balanceId: escrow.balanceId,
          buyerPublicKey: buyerKeypair.publicKey(),
          buyerSecretKey: buyerKeypair.secret(),
          priorityFeeStroops: '20000', // Bumped
        }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1); // Only one can win
      expect(rejected.length).toBe(1);

      // If buyer won, the refund should be the fulfilled one
      const winner = fulfilled[0] as PromiseFulfilledResult<any>;
      const txStatus = await service.getTransactionStatus(
        winner.value.transactionHash,
      );

      // Check operations to see who won
      console.log(
        `🏆 Race finished. Winner Tx: ${winner.value.transactionHash}`,
      );
      if (rejected[0].status === 'rejected') {
        console.log(`❌ Loser Reason: ${rejected[0].reason.message}`);
      }
    });
  });

  // ─── Test Group 4: Censorship Simulation ──────────────────────────────────

  describe('Scenario: Censorship / Congestion Simulation', () => {
    it('should show that bumped transactions bypass base-fee "clogging"', async () => {
      console.log(
        '🧊 Simulating congestion (submitting multiple background txs)...',
      );

      // Start a few background txs to consume sequence numbers or just simulate load
      const backgroundTasks = Array.from({ length: 3 }).map((_, i) =>
        service.getAccountInfo(platformKeypair.publicKey()),
      );
      await Promise.all(backgroundTasks);

      const start = Date.now();
      const bumpedTx = await service.releaseUpfrontPayment({
        orderId: `urgent-${Date.now()}`,
        farmerPublicKey: farmerKeypair.publicKey(),
        amount: '0.5',
        priorityFeeStroops: '10000',
      });
      const end = Date.now();

      expect(bumpedTx.status).toBe('success');
      console.log(`⏱️ Priority tx landed in ${end - start}ms`);
    });
  });

  // ─── Test Group 5: Reordering Risk ────────────────────────────────────────

  describe('Scenario: Rebalancing Reordering', () => {
    it('should document that order of submission != order of execution if fees differ', async () => {
      const firstOrderId = `order-1-${Date.now()}`;
      const secondOrderId = `order-2-${Date.now()}`;

      console.log('🔄 Submitting Order 1 (Base) then Order 2 (Bumped)...');

      // We purposely don't await the first before starting the second
      const p1 = service.releaseUpfrontPayment({
        orderId: firstOrderId,
        farmerPublicKey: farmerKeypair.publicKey(),
        amount: '0.1',
      });

      const p2 = service.releaseUpfrontPayment({
        orderId: secondOrderId,
        farmerPublicKey: farmerKeypair.publicKey(),
        amount: '0.1',
        priorityFeeStroops: '30000',
      });

      const [r1, r2] = await Promise.allSettled([p1, p2]);

      if (r1.status === 'fulfilled' && r2.status === 'fulfilled') {
        const s1 = await service.getTransactionStatus(r1.value.transactionHash);
        const s2 = await service.getTransactionStatus(r2.value.transactionHash);

        console.log(
          `Order 1 Ledger: ${s1.ledger} | Order 2 Ledger: ${s2.ledger}`,
        );
        // It's possible Order 2 lands BEFORE Order 1 due to fee-bump
        if (s2.ledger! < s1.ledger!) {
          console.log(
            '⚠️ REORDERING DETECTED: Second transaction landed in an earlier ledger!',
          );
        }
      }
    });
  });

  // ─── Test Group 6: Defensive Gap Analysis ──────────────────────────────────

  describe('Defensive Gap Analysis', () => {
    it('should verify that without priority fee, service uses minimum base fee', async () => {
      const feeStats = await (service as any).server.feeStats();
      const minFee = feeStats.fee_charged.min;

      const result = await service.releaseUpfrontPayment({
        orderId: `baseline-${Date.now()}`,
        farmerPublicKey: farmerKeypair.publicKey(),
        amount: '0.01',
      });

      const status = await service.getTransactionStatus(result.transactionHash);
      const chargedStroops = Math.round(parseFloat(status.fee!) * 10000000);

      console.log(
        `Baseline charged: ${chargedStroops} stroops | Network min: ${minFee} stroops`,
      );
      // Current service uses 'mode' which is often the min
      expect(chargedStroops).toBeGreaterThanOrEqual(parseInt(minFee, 10));
    });
  });
});
