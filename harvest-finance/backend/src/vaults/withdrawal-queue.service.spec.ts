import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalQueueService } from './withdrawal-queue.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Withdrawal, WithdrawalStatus } from '../database/entities/withdrawal.entity';
import { DataSource } from 'typeorm';
import { EventBus } from '@nestjs/cqrs';
import { Vault } from '../database/entities/vault.entity';
import { VaultDebitedEvent } from './cqrs/events/vault-debited.event';

describe('WithdrawalQueueService', () => {
  let service: WithdrawalQueueService;
  let eventBus: EventBus;
  let dataSource: DataSource;

  const mockWithdrawalRepository = {
    findOne: jest.fn(),
    count: jest.fn(),
  };

  const mockEntityManager = {
    find: jest.fn(),
    save: jest.fn(),
    decrement: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (cb) => {
      return cb(mockEntityManager);
    }),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalQueueService,
        {
          provide: getRepositoryToken(Withdrawal),
          useValue: mockWithdrawalRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<WithdrawalQueueService>(WithdrawalQueueService);
    eventBus = module.get<EventBus>(EventBus);
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processQueue', () => {
    it('should process queue in strict FIFO order up to available liquidity', async () => {
      const w1 = new Withdrawal();
      w1.id = 'w1';
      w1.amount = 100;
      w1.userId = 'u1';
      w1.status = WithdrawalStatus.QUEUED;

      const w2 = new Withdrawal();
      w2.id = 'w2';
      w2.amount = 200;
      w2.userId = 'u2';
      w2.status = WithdrawalStatus.QUEUED;

      const w3 = new Withdrawal();
      w3.id = 'w3';
      w3.amount = 50;
      w3.userId = 'u3';
      w3.status = WithdrawalStatus.QUEUED;

      mockEntityManager.find.mockResolvedValueOnce([w1, w2, w3]);

      await service.processQueue('v1', 250);

      expect(mockEntityManager.find).toHaveBeenCalledWith(Withdrawal, expect.objectContaining({
        where: { vaultId: 'v1', status: WithdrawalStatus.QUEUED },
        order: { queuedAt: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      }));

      // Only w1 (100) and w2 (200) can't both be processed because total is 300, liquidity is 250.
      // Wait, w1 (100) will be processed, remaining liquidity 150.
      // w2 is 200 > 150, so it breaks. w3 is 50 but shouldn't be processed to maintain FIFO.
      expect(mockEntityManager.save).toHaveBeenCalledTimes(1);
      expect(w1.status).toBe(WithdrawalStatus.CONFIRMED);
      expect(w1.confirmedAt).toBeInstanceOf(Date);
      
      expect(w2.status).toBe(WithdrawalStatus.QUEUED); // unchanged
      expect(w3.status).toBe(WithdrawalStatus.QUEUED); // unchanged

      expect(mockEntityManager.decrement).toHaveBeenCalledWith(Vault, { id: 'v1' }, 'totalDeposits', 100);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledWith(new VaultDebitedEvent('v1', 'u1', 100));
    });

    it('should partially processing an item is disallowed; it must either clear fully or wait', async () => {
      const w1 = new Withdrawal();
      w1.id = 'w1';
      w1.amount = 100;
      w1.userId = 'u1';
      w1.status = WithdrawalStatus.QUEUED;

      mockEntityManager.find.mockResolvedValueOnce([w1]);

      await service.processQueue('v1', 50);

      expect(mockEntityManager.save).not.toHaveBeenCalled();
      expect(w1.status).toBe(WithdrawalStatus.QUEUED);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('getQueueMetrics', () => {
    it('should return metrics for user in queue', async () => {
      mockWithdrawalRepository.findOne.mockResolvedValueOnce({ queuedAt: new Date('2023-01-01') });
      mockWithdrawalRepository.count.mockResolvedValueOnce(3);

      const metrics = await service.getQueueMetrics('u1', 'v1');
      expect(metrics).toEqual({
        positionInQueue: 4,
        estimatedWaitTime: 'Pending liquidity',
      });
    });

    it('should return no active queue if user has no queued items', async () => {
      mockWithdrawalRepository.findOne.mockResolvedValueOnce(null);

      const metrics = await service.getQueueMetrics('u1', 'v1');
      expect(metrics).toEqual({
        positionInQueue: 0,
        estimatedWaitTime: 'No active queue',
      });
    });
  });
});
