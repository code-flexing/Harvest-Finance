import { Test, TestingModule } from '@nestjs/testing';
import { SorobanStorageService } from '../soroban-storage.service';
import { SorobanIndexerService } from '../soroban-indexer.service';
import { ConfigService } from '@nestjs/config';

describe('TTL Stress Test (Archival Simulation)', () => {
  let service: SorobanStorageService;
  let indexer: SorobanIndexerService;

  const mockIndexer = {
    getLatestLedger: jest.fn(),
    getLedgerEntries: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SorobanStorageService,
        { provide: SorobanIndexerService, useValue: mockIndexer },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) =>
              key === 'SOROBAN_RPC_URL' ? 'http://localhost' : null,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<SorobanStorageService>(SorobanStorageService);
    indexer = module.get<SorobanIndexerService>(SorobanIndexerService);
  });

  it('should detect when TTL is below threshold and trigger extension', async () => {
    const contractId = 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';
    const currentLedger = 100000;
    const liveUntil = 100500; // TTL = 500 < 1000 threshold

    mockIndexer.getLatestLedger.mockResolvedValue(currentLedger);
    mockIndexer.getLedgerEntries.mockResolvedValue({
      entries: [{ liveUntilLedger: liveUntil }],
    });

    const loggerSpy = jest.spyOn((service as any).logger, 'warn');

    await service.ensureStoragePersistence(contractId);

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('TTL below threshold'),
    );
  });

  it('should not trigger extension if TTL is sufficient', async () => {
    const contractId = 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';
    const currentLedger = 100000;
    const liveUntil = 105000; // TTL = 5000 > 1000 threshold

    mockIndexer.getLatestLedger.mockResolvedValue(currentLedger);
    mockIndexer.getLedgerEntries.mockResolvedValue({
      entries: [{ liveUntilLedger: liveUntil }],
    });

    const loggerSpy = jest.spyOn((service as any).logger, 'log');

    await service.ensureStoragePersistence(contractId);

    expect(loggerSpy).toHaveBeenCalledWith('TTL is sufficient.');
  });

  it('should simulate long-term inactivity by advancing current ledger', async () => {
    const contractId = 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';
    let currentLedger = 100000;
    const liveUntil = 105000; // Initially safe

    mockIndexer.getLedgerEntries.mockResolvedValue({
      entries: [{ liveUntilLedger: liveUntil }],
    });

    // Case 1: Inactivity period 1 (Safe)
    mockIndexer.getLatestLedger.mockResolvedValue(currentLedger);
    await service.ensureStoragePersistence(contractId);

    // Case 2: Inactivity period 2 (Still safe)
    currentLedger = 103000;
    mockIndexer.getLatestLedger.mockResolvedValue(currentLedger);
    await service.ensureStoragePersistence(contractId);

    // Case 3: Long inactivity (Now needs extension)
    currentLedger = 104500; // TTL = 500
    mockIndexer.getLatestLedger.mockResolvedValue(currentLedger);
    const loggerSpy = jest.spyOn((service as any).logger, 'warn');

    await service.ensureStoragePersistence(contractId);
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Extending'),
    );
  });
});
