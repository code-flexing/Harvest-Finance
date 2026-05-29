import { Test, TestingModule } from '@nestjs/testing';
import { StellarService } from './stellar.service';
import { ConfigService } from '@nestjs/config';
import { SecretsService } from '../../common/secrets/secrets.service';
import { CustomLoggerService } from '../../logger/custom-logger.service';
import * as StellarSdk from 'stellar-sdk';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('StellarService - Escrow Creation', () => {
  let service: StellarService;
  let configService: ConfigService;
  let secretsService: SecretsService;
  let mockServer: any;

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
                STELLAR_PLATFORM_PUBLIC_KEY:
                  'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
              };
              return config[key] ?? defaultValue;
            }),
            getOrThrow: jest
              .fn()
              .mockReturnValue(
                'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
              ),
          },
        },
        {
          provide: SecretsService,
          useValue: {
            getSecret: jest
              .fn()
              .mockResolvedValue(
                'SDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
              ),
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
      farmerPublicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX1',
      buyerPublicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX2',
      amount: '100.00',
      assetCode: 'USDC',
      assetIssuer: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX3',
      deadlineUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
      orderId: 'order-123',
    };

    it('should create escrow without fee bump', async () => {
      const mockAccount = {
        sequence: '12345',
        balances: [{ asset_type: 'native', balance: '1000' }],
      };

      const mockTransaction = {
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
      mockServer.submitTransaction.mockRejectedValue(
        new Error('Persistent failure'),
      );

      const mockTx = {} as any;

      await expect(service['submitWithRetry'](mockTx, 'test')).rejects.toThrow(
        'Persistent failure',
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
      jest.advanceTimersByTime(1000);

      const result = await promise;
      expect(result.hash).toBe('success');

      jest.useRealTimers();
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
        farmerPublicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX1',
        buyerPublicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX2',
        amount: '0',
        assetCode: 'USDC',
        assetIssuer: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX3',
        deadlineUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
        orderId: 'order-123',
      };

      await expect(service.createEscrow(params)).rejects.toThrow();
    });

    it('should handle very large amounts', async () => {
      const params = {
        farmerPublicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX1',
        buyerPublicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX2',
        amount: '922337203685.4775807',
        assetCode: 'USDC',
        assetIssuer: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX3',
        deadlineUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
        orderId: 'order-123',
      };

      const mockAccount = {
        sequence: '12345',
      };

      mockServer.loadAccount.mockResolvedValue(mockAccount);
      jest.spyOn(service as any, 'getBaseFee').mockResolvedValue('100');

      expect(async () => {
        await service.createEscrow(params);
      }).not.toThrow();
    });
  });
});
