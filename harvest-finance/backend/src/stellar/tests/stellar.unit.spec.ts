    // ─── releaseUpfrontPayment ────────────────────────────────────────────────

    describe('releaseUpfrontPayment', () => {
        it('should return success status for upfront payment', async () => {
            const result = await service.releaseUpfrontPayment({
                orderId: 'order-001',
                farmerPublicKey: MOCK_FARMER_KP.publicKey(),
                amount: '60',
                assetCode: 'XLM',
            });
            expect(result.status).toBe('success');
            expect(result.transactionHash).toBe('mock_tx_hash_abc123');
        });

        it('should reject invalid farmer public key', async () => {
            await expect(
                service.releaseUpfrontPayment({
                    orderId: 'order-001',
                    farmerPublicKey: 'INVALID_KEY',
                    amount: '60',
                    assetCode: 'XLM',
                })
            ).rejects.toThrow(BadRequestException);
        });
    });

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { StellarService } from '../services/stellar.service';
import * as StellarSdk from '@stellar/stellar-sdk';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const MOCK_PLATFORM_KP = StellarSdk.Keypair.random();
const MOCK_FARMER_KP   = StellarSdk.Keypair.random();
const MOCK_BUYER_KP    = StellarSdk.Keypair.random();

const mockAccount = {
    accountId: () => MOCK_PLATFORM_KP.publicKey(),
    sequence: '1000',
    balances: [{ asset_type: 'native', balance: '100.0000000' }],
    signers: [{ key: MOCK_PLATFORM_KP.publicKey(), weight: 1 }],
    thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
    incrementSequenceNumber: jest.fn(),
};

const mockSubmitResponse = {
    hash: 'mock_tx_hash_abc123',
    ledger: 1234567,
    fee_charged: '100',
    result_xdr: buildMockResultXdr(),
};

const mockFeeStats = {
    fee_charged: { mode: '100', min: '100', max: '1000', p10: '100', p50: '100', p90: '200' },
};

function buildMockResultXdr(): string {
    return 'AAAAAA==';
}

jest.mock('@stellar/stellar-sdk', () => {
    const actual = jest.requireActual('@stellar/stellar-sdk');
    return {
        ...actual,
        Horizon: {
        ...actual.Horizon,
        Server: jest.fn().mockImplementation(() => ({
            loadAccount: jest.fn().mockResolvedValue(mockAccount),
            submitTransaction: jest.fn().mockResolvedValue(mockSubmitResponse),
            feeStats: jest.fn().mockResolvedValue(mockFeeStats),
            transactions: jest.fn().mockReturnValue({
            transaction: jest.fn().mockReturnThis(),
            forAccount: jest.fn().mockReturnThis(),
            cursor: jest.fn().mockReturnThis(),
            call: jest.fn().mockResolvedValue({ hash: 'mock_hash', successful: true, ledger: 100, created_at: new Date().toISOString(), fee_charged: '100' }),
            stream: jest.fn().mockReturnValue(jest.fn()),
            }),
            operations: jest.fn().mockReturnValue({
            forTransaction: jest.fn().mockReturnThis(),
            call: jest.fn().mockResolvedValue({ records: [] }),
            }),
            claimableBalances: jest.fn().mockReturnValue({
            claimant: jest.fn().mockReturnThis(),
            call: jest.fn().mockResolvedValue({ records: [{ id: 'mock_balance_id' }] }),
            }),
        })),
        },
    };
    });

    // ─── Test Suite ───────────────────────────────────────────────────────────────

    describe('StellarService — Unit Tests', () => {
    let service: StellarService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
        providers: [
            StellarService,
            {
            provide: ConfigService,
            useValue: {
                get: jest.fn((key: string, defaultVal?: string) => {
                const map: Record<string, string> = {
                    STELLAR_NETWORK: 'testnet',
                    STELLAR_PLATFORM_PUBLIC_KEY: MOCK_PLATFORM_KP.publicKey(),
                    STELLAR_PLATFORM_SECRET_KEY: MOCK_PLATFORM_KP.secret(),
                };
                return map[key] ?? defaultVal;
                }),
                getOrThrow: jest.fn((key: string) => {
                const map: Record<string, string> = {
                    STELLAR_PLATFORM_PUBLIC_KEY: MOCK_PLATFORM_KP.publicKey(),
                    STELLAR_PLATFORM_SECRET_KEY: MOCK_PLATFORM_KP.secret(),
                };
                if (!map[key]) throw new Error(`Missing config: ${key}`);
                return map[key];
                }),
            },
            },
        ],
        }).compile();

        service = module.get<StellarService>(StellarService);

        jest.spyOn<any, any>(service, 'extractBalanceId').mockReturnValue('mock_balance_id_hex');
    });

    afterEach(() => jest.clearAllMocks());

    // ─── Validation ───────────────────────────────────────────────────────────

    describe('validatePublicKey (via getAccountInfo)', () => {
        it('should throw for an invalid public key', async () => {
        await expect(service.getAccountInfo('NOT_A_KEY')).rejects.toThrow(BadRequestException);
        });

        it('should accept a valid G-address', async () => {
        await expect(service.getAccountInfo(MOCK_PLATFORM_KP.publicKey())).resolves.toBeDefined();
        });
    });

    // ─── createEscrow ─────────────────────────────────────────────────────────

    describe('createEscrow', () => {
        const baseParams = {
        farmerPublicKey: MOCK_FARMER_KP.publicKey(),
        buyerPublicKey: MOCK_BUYER_KP.publicKey(),
        amount: '100',
        deadlineUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
        orderId: 'order-001',
        };

        it('should return an EscrowResult on success', async () => {
        const result = await service.createEscrow(baseParams);
        expect(result.balanceId).toBe('mock_balance_id_hex');
        expect(result.transactionHash).toBe('mock_tx_hash_abc123');
        expect(result.amount).toBe('100');
        expect(result.assetCode).toBe('XLM');
        });

        it('should reject a past deadline', async () => {
        await expect(
            service.createEscrow({ ...baseParams, deadlineUnixTimestamp: 1000 }),
        ).rejects.toThrow(BadRequestException);
        });

        it('should reject amount = 0', async () => {
        await expect(
            service.createEscrow({ ...baseParams, amount: '0' }),
        ).rejects.toThrow(BadRequestException);
        });

        it('should reject negative amount', async () => {
        await expect(
            service.createEscrow({ ...baseParams, amount: '-5' }),
        ).rejects.toThrow(BadRequestException);
        });

        it('should require assetIssuer for non-XLM assets', async () => {
        await expect(
            service.createEscrow({ ...baseParams, assetCode: 'USDC' }),
        ).rejects.toThrow(BadRequestException);
        });
    });

    // ─── releasePayment ───────────────────────────────────────────────────────

    describe('releasePayment', () => {
        it('should return success status', async () => {
        const result = await service.releasePayment({
            balanceId: 'mock_balance_id',
            farmerPublicKey: MOCK_FARMER_KP.publicKey(),
            farmerSecretKey: MOCK_FARMER_KP.secret(),
        });
        expect(result.status).toBe('success');
        });

        it('should reject mismatched keypair', async () => {
        const wrongKey = StellarSdk.Keypair.random();
        await expect(
            service.releasePayment({
            balanceId: 'mock_balance_id',
            farmerPublicKey: MOCK_FARMER_KP.publicKey(),
            farmerSecretKey: wrongKey.secret(), // wrong secret
            }),
        ).rejects.toThrow(BadRequestException);
        });
    });

    // ─── refundEscrow ─────────────────────────────────────────────────────────

    describe('refundEscrow', () => {
        it('should return success status', async () => {
        const result = await service.refundEscrow({
            balanceId: 'mock_balance_id',
            buyerPublicKey: MOCK_BUYER_KP.publicKey(),
            buyerSecretKey: MOCK_BUYER_KP.secret(),
        });
        expect(result.status).toBe('success');
        });

        it('should reject mismatched buyer keypair', async () => {
        const wrongKey = StellarSdk.Keypair.random();
        await expect(
            service.refundEscrow({
            balanceId: 'mock_balance_id',
            buyerPublicKey: MOCK_BUYER_KP.publicKey(),
            buyerSecretKey: wrongKey.secret(),
            }),
        ).rejects.toThrow(BadRequestException);
        });
    });

  // ─── setupMultiSigAccount ─────────────────────────────────────────────────

    describe('setupMultiSigAccount', () => {
            const cosigner = StellarSdk.Keypair.random();

        it('should succeed with valid threshold', async () => {
        const result = await service.setupMultiSigAccount({
            primaryPublicKey: MOCK_PLATFORM_KP.publicKey(),
            cosignerPublicKeys: [cosigner.publicKey()],
            threshold: 2,
            sourceSecretKey: MOCK_PLATFORM_KP.secret(),
        });
        expect(result.status).toBe('success');
    });

    it('should throw if threshold exceeds signer count', async () => {
        await expect(
            service.setupMultiSigAccount({
            primaryPublicKey: MOCK_PLATFORM_KP.publicKey(),
            cosignerPublicKeys: [cosigner.publicKey()],
            threshold: 10,
            sourceSecretKey: MOCK_PLATFORM_KP.secret(),
            }),
        ).rejects.toThrow(BadRequestException);
        });
    });

  // ─── estimateFee ──────────────────────────────────────────────────────────

    describe('estimateFee', () => {
        it('should return fee estimate for 1 operation', async () => {
        const fee = await service.estimateFee();
        expect(fee.currentNetworkFee).toBe(100);
        expect(fee.baseFee).toBe('0.0000100');
        });

        it('should scale total fee by operation count', async () => {
        const fee = await service.estimateFee(3);
        expect(fee.estimatedTotalFee).toBe('0.0000300');
        });
    });
});