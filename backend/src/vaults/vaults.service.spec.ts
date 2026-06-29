import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { VaultsService } from './vaults.service';
import { Vault } from './entities/vault.entity';

// ---------------------------------------------------------------------------
// Mock repository factory
// ---------------------------------------------------------------------------

const mockVault = (overrides: Partial<Vault> = {}): Vault => ({
  id: 'vault-uuid-1',
  name: 'Test Vault',
  tokenAddress: '0xabc123',
  ownerId: 'owner-uuid-1',
  totalAssets: '1000.000000000000000000',
  tvlAtHighWatermark: '1000.000000000000000000',
  watermarkAchievedAt: new Date('2024-01-01T00:00:00.000Z'),
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
});

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VaultsService', () => {
  let service: VaultsService;
  let repo: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultsService,
        { provide: getRepositoryToken(Vault), useFactory: mockRepository },
      ],
    }).compile();

    service = module.get<VaultsService>(VaultsService);
    repo = module.get(getRepositoryToken(Vault));
  });

  afterEach(() => jest.clearAllMocks());

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns all vaults as response DTOs', async () => {
      const vaults = [mockVault(), mockVault({ id: 'vault-uuid-2', name: 'Vault 2' })];
      repo.find.mockResolvedValue(vaults);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].tvlAtHighWatermark).toBeDefined();
      expect(result[0].watermarkAchievedAt).toBeDefined();
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns a single vault with watermark fields', async () => {
      const vault = mockVault();
      repo.findOne.mockResolvedValue(vault);

      const result = await service.findOne('vault-uuid-1');

      expect(result.id).toBe('vault-uuid-1');
      expect(result.tvlAtHighWatermark).toBe('1000.000000000000000000');
      expect(result.watermarkAchievedAt).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    });

    it('throws NotFoundException when vault does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── deposit ───────────────────────────────────────────────────────────────

  describe('deposit()', () => {
    it('throws NotFoundException when vault does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.deposit('non-existent', '100')).rejects.toThrow(NotFoundException);
    });

    it('updates totalAssets after deposit', async () => {
      const vault = mockVault({ totalAssets: '1000.000000000000000000', tvlAtHighWatermark: '1000.000000000000000000' });
      repo.findOne.mockResolvedValue(vault);
      repo.save.mockImplementation(async (v) => v);

      const result = await service.deposit('vault-uuid-1', '500');

      expect(parseFloat(result.totalAssets)).toBeCloseTo(1500, 5);
    });

    it('updates watermark when new TVL exceeds current watermark', async () => {
      const vault = mockVault({
        totalAssets: '1000.000000000000000000',
        tvlAtHighWatermark: '1000.000000000000000000',
      });
      repo.findOne.mockResolvedValue(vault);
      repo.save.mockImplementation(async (v) => v);

      const before = new Date();
      const result = await service.deposit('vault-uuid-1', '500');
      const after = new Date();

      expect(parseFloat(result.tvlAtHighWatermark)).toBeCloseTo(1500, 5);
      expect(result.watermarkAchievedAt).toBeDefined();
      expect(new Date(result.watermarkAchievedAt!).getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(new Date(result.watermarkAchievedAt!).getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('does NOT update watermark when new TVL is less than current watermark', async () => {
      const vault = mockVault({
        totalAssets: '500.000000000000000000',
        tvlAtHighWatermark: '2000.000000000000000000',
        watermarkAchievedAt: new Date('2024-01-01T00:00:00.000Z'),
      });
      repo.findOne.mockResolvedValue(vault);
      repo.save.mockImplementation(async (v) => v);

      const result = await service.deposit('vault-uuid-1', '100');

      // totalAssets goes to 600, still below watermark of 2000
      expect(parseFloat(result.tvlAtHighWatermark)).toBeCloseTo(2000, 5);
      expect(result.watermarkAchievedAt).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    });

    it('does NOT update watermark when new TVL equals current watermark', async () => {
      const vault = mockVault({
        totalAssets: '900.000000000000000000',
        tvlAtHighWatermark: '1000.000000000000000000',
        watermarkAchievedAt: new Date('2024-01-01T00:00:00.000Z'),
      });
      repo.findOne.mockResolvedValue(vault);
      repo.save.mockImplementation(async (v) => v);

      const result = await service.deposit('vault-uuid-1', '100');

      // totalAssets becomes exactly 1000 = current watermark, should NOT update
      expect(result.watermarkAchievedAt).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    });

    it('watermark is monotonically increasing across multiple deposits', async () => {
      let currentVault = mockVault({
        totalAssets: '0.000000000000000000',
        tvlAtHighWatermark: '0.000000000000000000',
        watermarkAchievedAt: null,
      });

      repo.findOne.mockImplementation(async () => currentVault);
      repo.save.mockImplementation(async (v) => {
        currentVault = { ...v };
        return currentVault;
      });

      await service.deposit('vault-uuid-1', '1000');
      expect(parseFloat(currentVault.tvlAtHighWatermark)).toBeCloseTo(1000, 5);

      await service.deposit('vault-uuid-1', '500');
      expect(parseFloat(currentVault.tvlAtHighWatermark)).toBeCloseTo(1500, 5);

      // Simulate withdrawal by resetting totalAssets (watermark must not drop)
      currentVault.totalAssets = '200.000000000000000000';

      await service.deposit('vault-uuid-1', '100');
      // New TVL = 300, still below watermark of 1500
      expect(parseFloat(currentVault.tvlAtHighWatermark)).toBeCloseTo(1500, 5);
    });

    it('sets watermark on first deposit from zero', async () => {
      const vault = mockVault({
        totalAssets: '0.000000000000000000',
        tvlAtHighWatermark: '0.000000000000000000',
        watermarkAchievedAt: null,
      });
      repo.findOne.mockResolvedValue(vault);
      repo.save.mockImplementation(async (v) => v);

      const result = await service.deposit('vault-uuid-1', '250');

      expect(parseFloat(result.tvlAtHighWatermark)).toBeCloseTo(250, 5);
      expect(result.watermarkAchievedAt).not.toBeNull();
    });
  });

  // ── getLeaderboard ────────────────────────────────────────────────────────

  describe('getLeaderboard()', () => {
    it('returns vaults ranked by tvlAtHighWatermark descending', async () => {
      const vaults = [
        mockVault({ id: '1', name: 'Top Vault', tvlAtHighWatermark: '5000.000000000000000000' }),
        mockVault({ id: '2', name: 'Mid Vault', tvlAtHighWatermark: '2000.000000000000000000' }),
        mockVault({ id: '3', name: 'Low Vault', tvlAtHighWatermark: '500.000000000000000000' }),
      ];
      repo.find.mockResolvedValue(vaults);

      const result = await service.getLeaderboard();

      expect(result).toHaveLength(3);
      expect(result[0].rank).toBe(1);
      expect(result[0].name).toBe('Top Vault');
      expect(result[1].rank).toBe(2);
      expect(result[2].rank).toBe(3);
    });

    it('each entry includes rank, id, name, tvlAtHighWatermark, watermarkAchievedAt, totalAssets', async () => {
      repo.find.mockResolvedValue([mockVault()]);

      const result = await service.getLeaderboard();

      expect(result[0]).toMatchObject({
        rank: expect.any(Number),
        id: expect.any(String),
        name: expect.any(String),
        tvlAtHighWatermark: expect.any(String),
        totalAssets: expect.any(String),
      });
    });

    it('returns empty array when no vaults exist', async () => {
      repo.find.mockResolvedValue([]);

      const result = await service.getLeaderboard();

      expect(result).toEqual([]);
    });
  });
});
