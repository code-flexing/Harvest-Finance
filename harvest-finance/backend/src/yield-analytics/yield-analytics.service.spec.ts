import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { YieldAnalyticsService } from './yield-analytics.service';
import { YieldAnalytics } from '../database/entities/yield-analytics.entity';
import { SorobanEvent } from '../database/entities/soroban-event.entity';

describe('YieldAnalyticsService', () => {
  let service: YieldAnalyticsService;
  let yieldAnalyticsRepository: jest.Mocked<Repository<YieldAnalytics>>;
  let sorobanEventRepository: jest.Mocked<Repository<SorobanEvent>>;

  const mockSorobanEvent: SorobanEvent = {
    id: 'test-id',
    eventId: 'test-event-id',
    type: 'contract',
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    ledger: 123456,
    ledgerClosedAt: new Date('2026-04-26T12:00:00Z'),
    transactionHash: 'test-tx-hash',
    pagingToken: 'test-paging-token',
    topics: ['HardWork'],
    value: {
      totalAssets: '1000000',
      totalShares: '950000',
    },
    inSuccessfulContractCall: true,
    indexedAt: new Date(),
  };

  const mockYieldAnalytics: YieldAnalytics = {
    id: 'test-yield-id',
    contractId: 'test-contract',
    date: new Date('2026-04-26'),
    totalAssets: '1000000',
    totalShares: '950000',
    hardworkEventsCount: 5,
    sevenDayApy: 8.5,
    dailyApy: 0.02,
    pricePerShare: '1052631578947368421',
    pricePerSharePrevious: '1050000000000000000',
    volume24h: '500000',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockYieldAnalyticsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      upsert: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    const mockSorobanEventRepository = {
      find: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YieldAnalyticsService,
        {
          provide: getRepositoryToken(YieldAnalytics),
          useValue: mockYieldAnalyticsRepository,
        },
        {
          provide: getRepositoryToken(SorobanEvent),
          useValue: mockSorobanEventRepository,
        },
      ],
    }).compile();

    service = module.get<YieldAnalyticsService>(YieldAnalyticsService);
    yieldAnalyticsRepository = module.get(getRepositoryToken(YieldAnalytics));
    sorobanEventRepository = module.get(getRepositoryToken(SorobanEvent));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processHardWorkEvents', () => {
    it('should process HardWork events successfully', async () => {
      sorobanEventRepository.find.mockResolvedValue([mockSorobanEvent]);
      yieldAnalyticsRepository.find.mockResolvedValue([]);
      yieldAnalyticsRepository.upsert.mockResolvedValue(undefined);

      await service.processHardWorkEvents();

      expect(sorobanEventRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'contract',
            ledgerClosedAt: expect.any(Object),
          }),
          order: { ledgerClosedAt: 'ASC' },
        }),
      );
    });

    it('should handle no events gracefully', async () => {
      sorobanEventRepository.find.mockResolvedValue([]);

      await service.processHardWorkEvents();

      expect(yieldAnalyticsRepository.upsert).not.toHaveBeenCalled();
    });

    it('should handle errors during processing', async () => {
      sorobanEventRepository.find.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.processHardWorkEvents()).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('isHardWorkEvent', () => {
    it('should identify valid HardWork events', () => {
      const validEvent = {
        ...mockSorobanEvent,
        topics: ['HardWork'],
        value: {
          totalAssets: '1000000',
          totalShares: '950000',
        },
      };

      // Access private method for testing
      const isHardWorkEvent = (service as any).isHardWorkEvent.bind(service);
      expect(isHardWorkEvent(validEvent)).toBe(true);
    });

    it('should reject events without HardWork topic', () => {
      const invalidEvent = {
        ...mockSorobanEvent,
        topics: ['OtherEvent'],
      };

      const isHardWorkEvent = (service as any).isHardWorkEvent.bind(service);
      expect(isHardWorkEvent(invalidEvent)).toBe(false);
    });

    it('should reject events without required value fields', () => {
      const invalidEvent = {
        ...mockSorobanEvent,
        topics: ['HardWork'],
        value: {
          totalAssets: '1000000',
          // missing totalShares
        },
      };

      const isHardWorkEvent = (service as any).isHardWorkEvent.bind(service);
      expect(isHardWorkEvent(invalidEvent)).toBe(false);
    });
  });

  describe('calculateDailyApy', () => {
    it('should calculate daily APY correctly', () => {
      const currentPrice = 1052631578947368421n; // 1.0526...
      const previousPrice = 1050000000000000000n; // 1.05

      const calculateDailyApy = (service as any).calculateDailyApy.bind(
        service,
      );
      const result = calculateDailyApy(currentPrice, previousPrice);

      expect(result).toBeCloseTo(148.77, 1); // Approximately 148.77% APY
    });

    it('should return null when previous price is null', () => {
      const currentPrice = 1052631578947368421n;
      const previousPrice = null;

      const calculateDailyApy = (service as any).calculateDailyApy.bind(
        service,
      );
      const result = calculateDailyApy(currentPrice, previousPrice);

      expect(result).toBeNull();
    });

    it('should return null when previous price is zero', () => {
      const currentPrice = 1052631578947368421n;
      const previousPrice = 0n;

      const calculateDailyApy = (service as any).calculateDailyApy.bind(
        service,
      );
      const result = calculateDailyApy(currentPrice, previousPrice);

      expect(result).toBeNull();
    });
  });

  describe('getYieldAnalytics', () => {
    it('should return yield analytics for a contract', async () => {
      yieldAnalyticsRepository.find.mockResolvedValue([mockYieldAnalytics]);

      const result = await service.getYieldAnalytics('test-contract', 30);

      expect(yieldAnalyticsRepository.find).toHaveBeenCalledWith({
        where: {
          contractId: 'test-contract',
          date: expect.any(Object), // Between operator
        },
        order: { date: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].contractId).toBe('test-contract');
    });
  });

  describe('getCurrentSevenDayApys', () => {
    it('should return current APYs for all contracts', async () => {
      const mockAnalytics = [
        { contractId: 'contract1', sevenDayApy: 8.5 },
        { contractId: 'contract2', sevenDayApy: 7.2 },
      ];

      yieldAnalyticsRepository.find.mockResolvedValue(mockAnalytics as any);

      const result = await service.getCurrentSevenDayApys();

      expect(yieldAnalyticsRepository.find).toHaveBeenCalledWith({
        where: { date: expect.any(Date) },
        select: ['contractId', 'sevenDayApy'],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        contractId: 'contract1',
        apy: 8.5,
      });
    });
  });
});
