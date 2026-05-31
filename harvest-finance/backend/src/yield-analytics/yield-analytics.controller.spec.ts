import { Test, TestingModule } from '@nestjs/testing';
import { YieldAnalyticsController } from './yield-analytics.controller';
import { YieldAnalyticsService } from './yield-analytics.service';
import {
  YieldAnalyticsPageDto,
  ContractApyDto,
  ProcessHardWorkEventsResponseDto,
} from './dto/yield-analytics.dto';

describe('YieldAnalyticsController', () => {
  let controller: YieldAnalyticsController;
  let service: jest.Mocked<YieldAnalyticsService>;

  const mockYieldAnalyticsData = [
    {
      contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      date: new Date('2026-04-26'),
      totalAssets: '1000000',
      totalShares: '950000',
      hardworkEventsCount: 5,
      sevenDayApy: 8.5,
      dailyApy: 0.02,
      pricePerShare: '1052631578947368421',
      pricePerSharePrevious: '1050000000000000000',
      volume24h: '500000',
    },
  ];

  const mockContractApys: ContractApyDto[] = [
    { contractId: 'contract1', apy: 8.5 },
    { contractId: 'contract2', apy: 7.2 },
  ];

  beforeEach(async () => {
    const mockYieldAnalyticsService = {
      getYieldAnalytics: jest.fn(),
      getCurrentSevenDayApys: jest.fn(),
      processHardWorkEvents: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [YieldAnalyticsController],
      providers: [
        {
          provide: YieldAnalyticsService,
          useValue: mockYieldAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<YieldAnalyticsController>(YieldAnalyticsController);
    service = module.get<YieldAnalyticsService>(YieldAnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getYieldAnalytics', () => {
    it('should return paginated yield analytics', async () => {
      service.getYieldAnalytics.mockResolvedValue(mockYieldAnalyticsData);

      const result = await controller.getYieldAnalytics({
        contractId: 'test-contract',
        days: 30,
        skip: 0,
        limit: 50,
      });

      expect(service.getYieldAnalytics).toHaveBeenCalledWith(
        'test-contract',
        30,
      );
      expect(result).toEqual({
        items: mockYieldAnalyticsData,
        total: 1,
        skip: 0,
        limit: 50,
      });
    });

    it('should use default values when not provided', async () => {
      service.getYieldAnalytics.mockResolvedValue([]);

      await controller.getYieldAnalytics({});

      expect(service.getYieldAnalytics).toHaveBeenCalledWith('', 30);
    });
  });

  describe('getCurrentApys', () => {
    it('should return current APYs for all contracts', async () => {
      service.getCurrentSevenDayApys.mockResolvedValue(mockContractApys);

      const result = await controller.getCurrentApys();

      expect(service.getCurrentSevenDayApys).toHaveBeenCalled();
      expect(result).toEqual(mockContractApys);
    });
  });

  describe('getContractYieldAnalytics', () => {
    it('should return yield analytics for specific contract', async () => {
      service.getYieldAnalytics.mockResolvedValue(mockYieldAnalyticsData);

      const result = await controller.getContractYieldAnalytics(
        'test-contract',
        {
          days: 14,
          skip: 0,
          limit: 25,
        },
      );

      expect(service.getYieldAnalytics).toHaveBeenCalledWith(
        'test-contract',
        14,
      );
      expect(result).toEqual({
        items: mockYieldAnalyticsData,
        total: 1,
        skip: 0,
        limit: 25,
      });
    });
  });

  describe('processHardWorkEvents', () => {
    it('should process HardWork events successfully', async () => {
      service.processHardWorkEvents.mockResolvedValue(undefined);

      const result = await controller.processHardWorkEvents();

      expect(service.processHardWorkEvents).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        eventsProcessed: 0,
        message: 'HardWork events processed successfully',
      });
    });

    it('should handle processing errors', async () => {
      service.processHardWorkEvents.mockRejectedValue(
        new Error('Processing failed'),
      );

      const result = await controller.processHardWorkEvents();

      expect(result).toEqual({
        success: false,
        eventsProcessed: 0,
        message: 'Error processing HardWork events: Processing failed',
      });
    });
  });
});
