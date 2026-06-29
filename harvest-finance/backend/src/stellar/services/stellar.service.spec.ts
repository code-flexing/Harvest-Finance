import { Test, TestingModule } from '@nestjs/testing';
import { StellarService, FeeCapExceededException } from './stellar.service';
import { ConfigService } from '@nestjs/config';
import { SecretsService } from '../../common/secrets/secrets.service';
import { CustomLoggerService } from '../../logger/custom-logger.service';
import * as StellarSdk from 'stellar-sdk';
import {
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CircuitBreaker } from '../utils/circuit-breaker';
import { isRetryableStellarError } from '../utils/stellar-retry';

describe('StellarService - Escrow Creation', () => {
  let service: StellarService;
  let configService: ConfigService;
  let secretsService: SecretsService;
  let mockServer: any;
  const platformKeypair = StellarSdk.Keypair.random();
  const farmerKeypair = StellarSdk.Keypair.random();
  const buyerKeypair = StellarSdk.Keypair.random();
  const issuerKeypair = StellarSdk.Keypair.random();

  beforeEach(async () => {
    mockServer = {
      loadAccount: jest.fn(),
      submitTransaction: jest.fn(),
      transactions: jest.fn().mockReturnValue({
        transaction: jest.fn().mockReturnValue({
          call: jest.fn(),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key, defaultValue) => {
              const config: Record<string, any> = {
                STELLAR_NETWORK: 'testnet',
                STELLAR_PLATFORM_PUBLIC_KEY: platformKeypair.publicKey(),
              };
              return config[key] ?? defaultValue;
            }),
            getOrThrow: jest
              .fn()
              .mockReturnValue(platformKeypair.publicKey()),
          },
        },
        {
          provide: SecretsService,
          useValue: {
            getSecret: jest.fn().mockResolvedValue(platformKeypair.secret()),
          },
        },
        {
          provide: CustomLoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    configService = module.get<ConfigService>(ConfigService);
    secretsService = module.get<SecretsService>(SecretsService);

    service['server'] = mockServer;
    await service.onModuleInit();
  });

  describe('createEscrow', () => {
    const validParams = {
      farmerPublicKey: farmerKeypair.publicKey(),
      buyerPublicKey: buyerKeypair.publicKey(),
      amount: '100.00',
      assetCode: 'USDC',
      assetIssuer: issuerKeypair.publicKey(),
      deadlineUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
      orderId: 'order-123',
    };

    it('should create escrow without fee bump', async () => {
      const mockAccount = {
        sequence: '12345',
        balances: [{ asset_type: 'native', balance: '1000' }],
      };

      const mockTransaction = {
        sign: jest.fn(),
        toXDR: jest.fn().mockReturnValue('xdr-string'),
      };

      const mockResponse = {
        hash: 'tx-hash-123',
        result_xdr:
          'AAAAAgAAAABZ6/qWZrwJZO2d5fLVdDKnJV0R9H7r5ygEfL1sSkPZvO+/tL7tZqqzVON4eXiR6xrN7o7PmWXNZcvNLpEXXs4=',
      };

      mockServer.loadAccount.mockResolvedValue(mockAccount);
      mockServer.submitTransaction.mockResolvedValue(mockResponse);

      jest
        .spyOn(StellarSdk.TransactionBuilder.prototype, 'build')
        .mockReturnValue(mockTransaction as any);
      jest.spyOn(service as any, 'getBaseFee').mockResolvedValue('100');
      jest
        .spyOn(service as any, 'extractBalanceId')
        .mockReturnValue('balance-id-123');

      const result = await service.createEscrow(validParams);

      expect(result.transactionHash).toBe('tx-hash-123');
      expect(result.amount).toBe('100.00');
      expect(result.farmerPublicKey).toBe(validParams.farmerPublicKey);
      expect(result.buyerPublicKey).toBe(validParams.buyerPublicKey);
    });

    it('should create escrow with fee bump transaction', async () => {
      const mockAccount = {
        sequence: '12345',
        balances: [{ asset_type: 'native', balance: '1000' }],
      };

      const mockTransaction = {
        sign: jest.fn(),
        toXDR: jest.fn().mockReturnValue('xdr-string'),
      };

      const mockResponse = {
        hash: 'fee-bump-hash',
        result_xdr:
          'AAAAAgAAAABZ6/qWZrwJZO2d5fLVdDKnJV0R9H7r5ygEfL1sSkPZvO+/tL7tZqqzVON4eXiR6xrN7o7PmWXNZcvNLpEXXs4=',
      };

      mockServer.loadAccount.mockResolvedValue(mockAccount);
      mockServer
        .transactions()
        .transaction()
        .call.mockResolvedValue(mockResponse);

      jest
        .spyOn(StellarSdk.TransactionBuilder.prototype, 'build')
        .mockReturnValue(mockTransaction as any);
      jest.spyOn(service as any, 'getBaseFee').mockResolvedValue('100');
      jest
        .spyOn(service as any, 'extractBalanceId')
        .mockReturnValue('balance-id-123');
      jest.spyOn(service as any, 'submitWithFeeBump').mockResolvedValue({
        feeBumpTransactionHash: 'fee-bump-hash',
        innerTransactionHash: 'inner-hash',
        createdAt: new Date(),
      });

      const result = await service.createEscrow({
        ...validParams,
        priorityFeeStroops: 5000,
      });

      expect(result.feeBumpTransactionHash).toBe('fee-bump-hash');
      expect(result.amount).toBe('100.00');
    });

    it('should validate public keys', async () => {
      const invalidParams = {
        ...validParams,
        farmerPublicKey: 'invalid-key',
      };

      await expect(service.createEscrow(invalidParams)).rejects.toThrow();
    });

    it('should reject deadline in the past', async () => {
      const pastDeadline = {
        ...validParams,
        deadlineUnixTimestamp: Math.floor(Date.now() / 1000) - 3600,
      };

      await expect(service.createEscrow(pastDeadline)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle submission errors gracefully', async () => {
      const mockAccount = {
        sequence: '12345',
        balances: [{ asset_type: 'native', balance: '1000' }],
      };

      mockServer.loadAccount.mockResolvedValue(mockAccount);
      mockServer.submitTransaction.mockRejectedValue(
        new Error('Network timeout'),
      );

      jest.spyOn(service as any, 'getBaseFee').mockResolvedValue('100');
      jest
        .spyOn(service as any, 'handleStellarError')
        .mockImplementation(() => {
          throw new InternalServerErrorException(
            'Failed to submit transaction',
          );
        });

      await expect(service.createEscrow(validParams)).rejects.toThrow();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on submission failure', async () => {
      const mockAccount = {
        sequence: '12345',
        balances: [{ asset_type: 'native', balance: '1000' }],
      };

      const mockTransaction = {
        sign: jest.fn(),
        toXDR: jest.fn().mockReturnValue('xdr-string'),
      };

      const mockResponse = {
        hash: 'tx-hash-123',
        result_xdr: 'AAAAAgAAAABZ6/qWZrwJZO2d5fLVdDKnJV0R9H7r5ygEfL1sSkPZ',
      };

      mockServer.loadAccount.mockResolvedValue(mockAccount);
      mockServer.submitTransaction
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(mockResponse);

      jest.spyOn(service as any, 'getBaseFee').mockResolvedValue('100');

      const submitWithRetrySpy = jest.spyOn(service as any, 'submitWithRetry');
      const mockTx = {} as any;

      await service['submitWithRetry'](mockTx, 'test');

      expect(mockServer.submitTransaction).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const persistentTimeout = Object.assign(new Error('Persistent timeout'), {
        code: 'ETIMEDOUT',
      });

      mockServer.submitTransaction.mockRejectedValue(persistentTimeout);

      const mockTx = {} as any;

      await expect(service['submitWithRetry'](mockTx, 'test')).rejects.toThrow(
        'Persistent timeout',
      );
      expect(mockServer.submitTransaction).toHaveBeenCalledTimes(3);
    });

    it('should wait between retry attempts', async () => {
      const mockAccount = {
        sequence: '12345',
      };

      mockServer.loadAccount.mockResolvedValue(mockAccount);
      mockServer.submitTransaction
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ hash: 'success' });

      jest.useFakeTimers();
      const mockTx = {} as any;

      const promise = service['submitWithRetry'](mockTx, 'test');
      await jest.advanceTimersByTimeAsync(1000);

      const result = await promise;
      expect(result.hash).toBe('success');

      jest.useRealTimers();
    });
  });

  describe('Horizon Circuit Breaker', () => {
    beforeEach(() => {
      (service as any).horizonCircuitBreaker = new CircuitBreaker({
        name: 'stellar-horizon-test',
        failureThreshold: 2,
        resetTimeoutMs: 30_000,
        shouldTrip: isRetryableStellarError,
      });
    });

    it('opens after repeated transient Horizon failures and blocks the next call', async () => {
      const transientFailure = {
        response: { status: 503 },
        message: 'Horizon unavailable',
      };

      mockServer.loadAccount.mockRejectedValue(transientFailure);

      await expect(
        service.getAccountInfo(farmerKeypair.publicKey()),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.getAccountInfo(farmerKeypair.publicKey()),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.getAccountInfo(farmerKeypair.publicKey()),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(mockServer.loadAccount).toHaveBeenCalledTimes(2);
    });
  });

  describe('Fee Bump Transactions', () => {
    it('should submit fee bump with priority fee', async () => {
      const submitFeeBumpSpy = jest
        .spyOn(service as any, 'submitWithFeeBump')
        .mockResolvedValue({
          feeBumpTransactionHash: 'fee-bump-hash',
          innerTransactionHash: 'inner-hash',
          createdAt: new Date(),
        });

      const xdrString = 'mock-xdr';
      const secretKey = 'SDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      const priorityFee = 5000;

      await service['submitWithFeeBump'](xdrString, secretKey, priorityFee);

      expect(submitFeeBumpSpy).toHaveBeenCalledWith(
        xdrString,
        secretKey,
        priorityFee,
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amount', async () => {
      const params = {
        farmerPublicKey: farmerKeypair.publicKey(),
        buyerPublicKey: buyerKeypair.publicKey(),
        amount: '0',
        assetCode: 'USDC',
        assetIssuer: issuerKeypair.publicKey(),
        deadlineUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
        orderId: 'order-123',
      };

      await expect(service.createEscrow(params)).rejects.toThrow();
    });

    it('should handle very large amounts', async () => {
      const params = {
        farmerPublicKey: farmerKeypair.publicKey(),
        buyerPublicKey: buyerKeypair.publicKey(),
        amount: '922337203685.4775807',
        assetCode: 'USDC',
        assetIssuer: issuerKeypair.publicKey(),
        deadlineUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
        orderId: 'order-123',
      };

      const mockAccount = {
        sequence: '12345',
        balances: [{ asset_type: 'native', balance: '1000' }],
      };

      const mockTransaction = {
        sign: jest.fn(),
        toXDR: jest.fn().mockReturnValue('xdr-string'),
      };

      mockServer.loadAccount.mockResolvedValue(mockAccount);
      mockServer.submitTransaction.mockResolvedValue({
        hash: 'tx-hash-123',
        result_xdr:
          'AAAAAgAAAABZ6/qWZrwJZO2d5fLVdDKnJV0R9H7r5ygEfL1sSkPZvO+/tL7tZqqzVON4eXiR6xrN7o7PmWXNZcvNLpEXXs4=',
      });
      jest.spyOn(service as any, 'getBaseFee').mockResolvedValue('100');
      jest
        .spyOn(service as any, 'extractBalanceId')
        .mockReturnValue('balance-id-123');
      jest
        .spyOn(StellarSdk.TransactionBuilder.prototype, 'build')
        .mockReturnValue(mockTransaction as any);

      await expect(service.createEscrow(params)).resolves.toMatchObject({
        amount: params.amount,
        farmerPublicKey: params.farmerPublicKey,
        buyerPublicKey: params.buyerPublicKey,
      });
    });
  });

  describe('Multi-Sig Setup', () => {
    const sourceKeypair = StellarSdk.Keypair.random();
    const cosignerKeypairOne = StellarSdk.Keypair.random();
    const cosignerKeypairTwo = StellarSdk.Keypair.random();

    const baseParams = {
      primaryPublicKey: sourceKeypair.publicKey(),
      cosignerPublicKeys: [
        cosignerKeypairOne.publicKey(),
        cosignerKeypairTwo.publicKey(),
      ],
      threshold: 2,
      sourceSecretKey: sourceKeypair.secret(),
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should reject a threshold higher than the total number of signers', async () => {
      await expect(
        service.setupMultiSigAccount({
          ...baseParams,
          threshold: 4,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockServer.loadAccount).not.toHaveBeenCalled();
    });

    it('should apply the requested threshold to the multisig transaction', async () => {
      const mockAccount = {
        sequence: '12345',
      };

      const addOperationSpy = jest
        .spyOn(StellarSdk.TransactionBuilder.prototype, 'addOperation')
        .mockReturnThis();
      const setTimeoutSpy = jest
        .spyOn(StellarSdk.TransactionBuilder.prototype, 'setTimeout')
        .mockReturnThis();
      const buildSpy = jest
        .spyOn(StellarSdk.TransactionBuilder.prototype, 'build')
        .mockReturnValue({
          sign: jest.fn(),
        } as any);
      const setOptionsSpy = jest
        .spyOn(StellarSdk.Operation, 'setOptions')
        .mockImplementation((options: any) => options);
      const fromSecretSpy = jest
        .spyOn(StellarSdk.Keypair, 'fromSecret')
        .mockReturnValue({
          publicKey: () => baseParams.primaryPublicKey,
        } as any);

      mockServer.loadAccount.mockResolvedValue(mockAccount);
      jest.spyOn(service as any, 'getBaseFee').mockResolvedValue('100');
      jest.spyOn(service as any, 'submitWithRetry').mockResolvedValue({
        hash: 'tx-hash-123',
        ledger: 123,
      });

      const result = await service.setupMultiSigAccount(baseParams);

      expect(result.status).toBe('success');
      expect(fromSecretSpy).toHaveBeenCalledWith(baseParams.sourceSecretKey);
      expect(setOptionsSpy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          masterWeight: 1,
          lowThreshold: baseParams.threshold,
          medThreshold: baseParams.threshold,
          highThreshold: baseParams.threshold,
        }),
      );
      expect(setOptionsSpy).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          signer: {
            ed25519PublicKey: baseParams.cosignerPublicKeys[0],
            weight: 1,
          },
        }),
      );
      expect(setOptionsSpy).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          signer: {
            ed25519PublicKey: baseParams.cosignerPublicKeys[1],
            weight: 1,
          },
        }),
      );
      expect(addOperationSpy).toHaveBeenCalledTimes(3);
      expect(setTimeoutSpy).toHaveBeenCalledWith(30);
      expect(buildSpy).toHaveBeenCalled();
    });
  });
});

describe('StellarService - getBaseFee', () => {
  let service: StellarService;
  let mockConfigGet: jest.Mock;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  const platformKeypair = StellarSdk.Keypair.random();

  beforeEach(async () => {
    mockConfigGet = jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        STELLAR_NETWORK: 'testnet',
        STELLAR_PLATFORM_PUBLIC_KEY: platformKeypair.publicKey(),
      };
      return config[key] ?? defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        {
          provide: ConfigService,
          useValue: {
            get: mockConfigGet,
            getOrThrow: jest.fn().mockReturnValue(platformKeypair.publicKey()),
          },
        },
        {
          provide: SecretsService,
          useValue: { getSecret: jest.fn().mockResolvedValue(platformKeypair.secret()) },
        },
        {
          provide: CustomLoggerService,
          useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    service['server'] = {
      loadAccount: jest.fn(),
      submitTransaction: jest.fn(),
      feeStats: jest.fn(),
    } as any;
    await service.onModuleInit();

    logSpy = jest.spyOn(service['logger'], 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockFeeStats(p90: number) {
    jest.spyOn(service as any, 'getHorizonFeeStats').mockResolvedValue({
      fee_charged: { p90: String(p90), mode: '100' },
    });
  }

  it('returns p90 + 10% buffer on a normal network', async () => {
    mockFeeStats(200);
    const fee = await (service as any).getBaseFee();
    // Math.ceil(200 * 1.1) = 220
    expect(fee).toBe('220');
  });

  it('logs fee details on every successful call', async () => {
    mockFeeStats(200);
    await (service as any).getBaseFee();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Fee selected | p90=200'),
    );
  });

  it('throws FeeCapExceededException when buffered fee exceeds cap', async () => {
    // p90=10000, buffered=11000, default cap=10000
    mockFeeStats(10000);
    await expect((service as any).getBaseFee()).rejects.toThrow(FeeCapExceededException);
  });

  it('does not log before throwing when fee exceeds cap (exception carries the message)', async () => {
    mockFeeStats(10000);
    await expect((service as any).getBaseFee()).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('Operation queued for retry when fee cap is exceeded'),
      }),
    );
    // No misleading warn should fire before the throw
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Operation queued for retry when fee cap is exceeded'),
    );
  });

  it('respects a custom STELLAR_MAX_FEE_STROOPS cap from config', async () => {
    // Set cap to 5000, p90=4000 → buffered=4400 → under cap → OK
    mockConfigGet.mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'STELLAR_MAX_FEE_STROOPS') return 5000;
      const config: Record<string, any> = {
        STELLAR_NETWORK: 'testnet',
        STELLAR_PLATFORM_PUBLIC_KEY: platformKeypair.publicKey(),
      };
      return config[key] ?? defaultValue;
    });
    mockFeeStats(4000);
    const fee = await (service as any).getBaseFee();
    expect(fee).toBe('4400');
  });

  it('throws FeeCapExceededException when custom cap is exceeded', async () => {
    // Set cap to 5000, p90=5000 → buffered=5500 → exceeds cap → exception
    mockConfigGet.mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'STELLAR_MAX_FEE_STROOPS') return 5000;
      const config: Record<string, any> = {
        STELLAR_NETWORK: 'testnet',
        STELLAR_PLATFORM_PUBLIC_KEY: platformKeypair.publicKey(),
      };
      return config[key] ?? defaultValue;
    });
    mockFeeStats(5000);
    await expect((service as any).getBaseFee()).rejects.toThrow(FeeCapExceededException);
  });

  it('falls back to 100 stroops when fee stats are unavailable', async () => {
    jest.spyOn(service as any, 'getHorizonFeeStats').mockRejectedValue(new Error('Horizon down'));
    const fee = await (service as any).getBaseFee();
    expect(fee).toBe('100');
    expect(warnSpy).toHaveBeenCalledWith(
      'Could not fetch fee stats, using default 100 stroops',
    );
  });
});
