import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HarvestService } from './harvest.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { ethers } from 'ethers';

describe('HarvestService', () => {
  let service: HarvestService;
  let configService: ConfigService;
  let customLogger: CustomLoggerService;

  const mockProvider = {
    getBlockNumber: jest.fn(),
  } as any;

  const mockSigner = {
    getAddress: jest.fn(),
  } as any;

  const mockContract = {
    vaults: jest.fn(),
    strategies: jest.fn(),
    doHardWork: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HarvestService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: CustomLoggerService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HarvestService>(HarvestService);
    configService = module.get<ConfigService>(ConfigService);
    customLogger = module.get<CustomLoggerService>(CustomLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializeBlockchainConnection', () => {
    it('should initialize blockchain connection with valid config', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        switch (key) {
          case 'BLOCKCHAIN_RPC_URL':
            return 'http://localhost:8545';
          case 'HARVEST_PRIVATE_KEY':
            return '0x1234567890123456789012345678901234567890123456789012345678901234';
          case 'CONTROLLER_CONTRACT_ADDRESS':
            return '0x1234567890123456789012345678901234567890';
          default:
            return null;
        }
      });

      // Re-instantiate to trigger constructor
      const newService = new HarvestService(
        configService as any,
        customLogger as any,
      );

      expect(newService).toBeDefined();
    });

    it('should log error when blockchain config is missing', () => {
      (configService.get as jest.Mock).mockReturnValue(undefined);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const newService = new HarvestService(
        configService as any,
        customLogger as any,
      );

      expect(newService).toBeDefined();
      consoleSpy.mockRestore();
    });
  });

  describe('performHarvest', () => {
    beforeEach(() => {
      // Mock the initialized contract
      (service as any).controllerContract = mockContract;
      (service as any).isRunning = false;
      (service as any).provider = mockProvider;
      (service as any).signer = mockSigner;
    });

    it('should return error when blockchain connection not initialized', async () => {
      (service as any).controllerContract = null;

      const result = await service.performHarvest(
        '0x1234567890123456789012345678901234567890',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Blockchain connection not initialized');
    });

    it('should return error when already running', async () => {
      (service as any).isRunning = true;

      const result = await service.performHarvest(
        '0x1234567890123456789012345678901234567890',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Harvest already running');
    });

    it('should return error when vault is not registered', async () => {
      mockContract.vaults.mockResolvedValue(false);

      const result = await service.performHarvest(
        '0x1234567890123456789012345678901234567890',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not registered');
    });

    it('should return error when no strategy is set', async () => {
      mockContract.vaults.mockResolvedValue(true);
      mockContract.strategies.mockResolvedValue(ethers.ZeroAddress);

      const result = await service.performHarvest(
        '0x1234567890123456789012345678901234567890',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No strategy set');
    });

    it('should successfully perform harvest', async () => {
      const mockTx = {
        hash: '0xabc123',
        wait: jest.fn().mockResolvedValue({
          blockNumber: 123456,
        }),
      };

      mockContract.vaults.mockResolvedValue(true);
      mockContract.strategies.mockResolvedValue(
        '0x1111111111111111111111111111111111111111',
      );
      mockContract.doHardWork.mockResolvedValue(mockTx);

      const result = await service.performHarvest(
        '0x1234567890123456789012345678901234567890',
      );

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xabc123');
      expect(mockContract.doHardWork).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
      );
    });

    it('should handle transaction failure', async () => {
      mockContract.vaults.mockResolvedValue(true);
      mockContract.strategies.mockResolvedValue(
        '0x1111111111111111111111111111111111111111',
      );
      mockContract.doHardWork.mockRejectedValue(
        new Error('Transaction failed'),
      );

      const result = await service.performHarvest(
        '0x1234567890123456789012345678901234567890',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction failed');
    });

    it('should reset isRunning flag after completion', async () => {
      const mockTx = {
        hash: '0xabc123',
        wait: jest.fn().mockResolvedValue({
          blockNumber: 123456,
        }),
      };

      mockContract.vaults.mockResolvedValue(true);
      mockContract.strategies.mockResolvedValue(
        '0x1111111111111111111111111111111111111111',
      );
      mockContract.doHardWork.mockResolvedValue(mockTx);

      await service.performHarvest(
        '0x1234567890123456789012345678901234567890',
      );

      expect((service as any).isRunning).toBe(false);
    });

    it('should reset isRunning flag after failure', async () => {
      mockContract.vaults.mockResolvedValue(true);
      mockContract.strategies.mockResolvedValue(
        '0x1111111111111111111111111111111111111111',
      );
      mockContract.doHardWork.mockRejectedValue(
        new Error('Transaction failed'),
      );

      await service.performHarvest(
        '0x1234567890123456789012345678901234567890',
      );

      expect((service as any).isRunning).toBe(false);
    });
  });

  describe('harvestAllVaults', () => {
    it('should return empty result when no vaults', async () => {
      const result = await service.harvestAllVaults();

      expect(result.total).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toEqual([]);
    });
  });
});
