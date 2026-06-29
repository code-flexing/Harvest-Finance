import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StellarClientService } from '../services/stellar-client.service';
import * as StellarSdk from 'stellar-sdk';

// Prevent onModuleInit from starting the payment stream in tests
jest.mock('stellar-sdk', () => {
  const actual = jest.requireActual('stellar-sdk');
  return {
    ...actual,
    Horizon: {
      ...actual.Horizon,
      Server: jest.fn().mockImplementation(() => ({
        payments: jest.fn().mockReturnValue({
          forAccount: jest.fn().mockReturnValue({
            stream: jest.fn().mockReturnValue(() => {}),
          }),
        }),
        transactions: jest.fn().mockReturnValue({
          transaction: jest.fn().mockReturnValue({
            call: jest.fn().mockResolvedValue({ memo_type: 'none', memo: undefined }),
          }),
        }),
        feeStats: jest.fn(),
        submitTransaction: jest.fn(),
      })),
    },
  };
});

describe('StellarClientService – fee estimation', () => {
  let service: StellarClientService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockServer: any;

  const buildModule = async (maxFeeStroops?: number) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarClientService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: unknown) => {
              if (key === 'STELLAR_NETWORK') return 'testnet';
              if (key === 'STELLAR_PLATFORM_PUBLIC_KEY') return 'GTESTPUBLICKEY';
              if (key === 'NODE_ENV') return 'test';
              if (key === 'STELLAR_MAX_FEE_STROOPS') {
                return maxFeeStroops !== undefined ? maxFeeStroops : defaultValue;
              }
              return defaultValue;
            },
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    await module.init();
    service = module.get<StellarClientService>(StellarClientService);

    // Grab the mocked server instance that was created during construction
    const ServerConstructor = StellarSdk.Horizon.Server as jest.MockedClass<
      typeof StellarSdk.Horizon.Server
    >;
    mockServer = ServerConstructor.mock.results[ServerConstructor.mock.results.length - 1].value;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await buildModule();
  });

  // ------------------------------------------------------------------
  // estimateFee()
  // ------------------------------------------------------------------

  describe('estimateFee()', () => {
    it('returns Math.ceil(p90 * 1.1) when p90 is an integer value', async () => {
      mockServer.feeStats.mockResolvedValue({ fee_charged: { p90: '1000' } });

      const result = await service.estimateFee();

      // 1000 * 1.1 = 1100 (already integer)
      expect(result).toBe(1100);
    });

    it('rounds up when p90 * 1.1 is fractional', async () => {
      // 91 * 1.1 = 100.1  → ceil = 101
      mockServer.feeStats.mockResolvedValue({ fee_charged: { p90: '91' } });

      const result = await service.estimateFee();

      expect(result).toBe(101);
    });

    it('calls server.feeStats() exactly once per invocation', async () => {
      mockServer.feeStats.mockResolvedValue({ fee_charged: { p90: '500' } });

      await service.estimateFee();

      expect(mockServer.feeStats).toHaveBeenCalledTimes(1);
    });
  });

  // ------------------------------------------------------------------
  // submitTransaction()
  // ------------------------------------------------------------------

  describe('submitTransaction()', () => {
    const fakeTx = {} as StellarSdk.Transaction;

    it('throws FEE_EXCEEDS_CAP when estimated fee exceeds the configured cap', async () => {
      // fee = ceil(9100 * 1.1) = ceil(10010) = 10010 > cap of 10000
      mockServer.feeStats.mockResolvedValue({ fee_charged: { p90: '9100' } });
      jest.clearAllMocks();
      await buildModule(10000); // explicit cap
      mockServer.feeStats.mockResolvedValue({ fee_charged: { p90: '9100' } });

      await expect(service.submitTransaction(fakeTx)).rejects.toThrow('FEE_EXCEEDS_CAP');
    });

    it('does NOT call server.submitTransaction() when fee exceeds cap', async () => {
      mockServer.feeStats.mockResolvedValue({ fee_charged: { p90: '9100' } });
      jest.clearAllMocks();
      await buildModule(10000);
      mockServer.feeStats.mockResolvedValue({ fee_charged: { p90: '9100' } });

      await expect(service.submitTransaction(fakeTx)).rejects.toThrow('FEE_EXCEEDS_CAP');
      expect(mockServer.submitTransaction).not.toHaveBeenCalled();
    });

    it('calls server.submitTransaction() and returns its result when fee is within cap', async () => {
      // fee = ceil(100 * 1.1) = 110 < cap of 10000
      const fakeResponse = { hash: 'abc123' } as unknown as StellarSdk.Horizon.HorizonApi.SubmitTransactionResponse;
      jest.clearAllMocks();
      await buildModule(10000);
      mockServer.feeStats.mockResolvedValue({ fee_charged: { p90: '100' } });
      mockServer.submitTransaction.mockResolvedValue(fakeResponse);

      const result = await service.submitTransaction(fakeTx);

      expect(mockServer.submitTransaction).toHaveBeenCalledWith(fakeTx);
      expect(result).toBe(fakeResponse);
    });

    it('uses default cap of 10000 when STELLAR_MAX_FEE_STROOPS is not configured', async () => {
      // fee = ceil(9100 * 1.1) = 10010 > default cap 10000
      mockServer.feeStats.mockResolvedValue({ fee_charged: { p90: '9100' } });

      // Default module (no explicit maxFeeStroops override)
      await expect(service.submitTransaction(fakeTx)).rejects.toThrow('FEE_EXCEEDS_CAP');
    });

    it('does not throw when fee exactly equals the cap', async () => {
      // fee = ceil(9090.9...) ~ ceil(9090 * 1.1) = ceil(9999) = 9999 < 10000  — use p90=9091 → ceil(9091*1.1)=ceil(10000.1)=10001 > cap
      // Use p90 such that ceil(p90*1.1) == cap:  p90=9091 → 10000.1 → ceil=10001 (exceeds)
      // p90=9090 → 9999 → ceil=9999 (within)
      const fakeResponse = { hash: 'def456' } as unknown as StellarSdk.Horizon.HorizonApi.SubmitTransactionResponse;
      jest.clearAllMocks();
      await buildModule(10000);
      mockServer.feeStats.mockResolvedValue({ fee_charged: { p90: '9090' } });
      mockServer.submitTransaction.mockResolvedValue(fakeResponse);

      const result = await service.submitTransaction(fakeTx);

      expect(result).toBe(fakeResponse);
    });
  });
});
