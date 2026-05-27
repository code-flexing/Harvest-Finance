import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { HarvestSchedulerService } from './harvest-scheduler.service';
import { HarvestService } from './harvest.service';
import { Logger } from '@nestjs/common';

describe('HarvestSchedulerService', () => {
  let service: HarvestSchedulerService;
  let harvestService: HarvestService;
  let configService: ConfigService;

  const mockHarvestService = {
    performHarvest: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockSchedulerRegistry = {
    addCronJob: jest.fn(),
  };

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HarvestSchedulerService,
        { provide: HarvestService, useValue: mockHarvestService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
      ],
    }).compile();

    service = module.get<HarvestSchedulerService>(HarvestSchedulerService);
    harvestService = module.get<HarvestService>(HarvestService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with default cron expression when not configured', () => {
    mockConfigService.get.mockReturnValue(undefined);

    // Re-instantiate to test constructor
    const newService = new HarvestSchedulerService(
      harvestService as any,
      configService as any,
      mockSchedulerRegistry as any,
    );

    expect(newService).toBeDefined();
  });

  it('should initialize with configured cron expression', () => {
    mockConfigService.get.mockReturnValue('0 */10 * * * *');

    const newService = new HarvestSchedulerService(
      harvestService as any,
      configService as any,
      mockSchedulerRegistry as any,
    );

    expect(newService).toBeDefined();
  });

  describe('handleHarvest', () => {
    it('should skip harvest when DEFAULT_VAULT_ADDRESS is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await service.handleHarvest();

      expect(mockConfigService.get).toHaveBeenCalledWith(
        'DEFAULT_VAULT_ADDRESS',
      );
      expect(harvestService.performHarvest).not.toHaveBeenCalled();
    });

    it('should perform harvest when DEFAULT_VAULT_ADDRESS is configured', async () => {
      const mockVaultAddress = '0x1234567890123456789012345678901234567890';
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DEFAULT_VAULT_ADDRESS') return mockVaultAddress;
        return null;
      });
      mockHarvestService.performHarvest.mockResolvedValue({
        success: true,
        txHash: '0xabc123',
      });

      await service.handleHarvest();

      expect(harvestService.performHarvest).toHaveBeenCalledWith(
        mockVaultAddress,
      );
    });

    it('should log warning when harvest fails', async () => {
      const mockVaultAddress = '0x1234567890123456789012345678901234567890';
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DEFAULT_VAULT_ADDRESS') return mockVaultAddress;
        return null;
      });
      mockHarvestService.performHarvest.mockResolvedValue({
        success: false,
        error: 'Test error',
      });

      await service.handleHarvest();

      expect(harvestService.performHarvest).toHaveBeenCalledWith(
        mockVaultAddress,
      );
    });

    it('should handle exception during harvest', async () => {
      const mockVaultAddress = '0x1234567890123456789012345678901234567890';
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DEFAULT_VAULT_ADDRESS') return mockVaultAddress;
        return null;
      });
      mockHarvestService.performHarvest.mockRejectedValue(
        new Error('Unexpected error'),
      );

      await service.handleHarvest();

      expect(harvestService.performHarvest).toHaveBeenCalledWith(
        mockVaultAddress,
      );
    });
  });
});
