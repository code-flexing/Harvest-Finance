import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DepositEvent,
  DepositEventType,
} from '../database/entities/deposit-event.entity';
import { DepositStatus } from '../database/entities/deposit.entity';
import { DepositEventService } from './deposit-event.service';

describe('DepositEventService', () => {
  let service: DepositEventService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositEventService,
        {
          provide: getRepositoryToken(DepositEvent),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DepositEventService>(DepositEventService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should append events without updating existing rows', async () => {
    const event = {
      id: 'event-1',
      depositId: 'deposit-1',
      userId: 'user-1',
      vaultId: 'vault-1',
      eventType: DepositEventType.INITIATED,
      amount: 100,
      payload: { status: DepositStatus.PENDING },
      transactionHash: null,
      stellarTransactionId: null,
      idempotencyKey: null,
      occurredAt: new Date(),
    };

    mockRepository.create.mockReturnValue(event);
    mockRepository.save.mockResolvedValue(event);

    const result = await service.appendEvent({
      depositId: 'deposit-1',
      userId: 'user-1',
      vaultId: 'vault-1',
      eventType: DepositEventType.INITIATED,
      amount: 100,
      payload: { status: DepositStatus.PENDING },
    });

    expect(result).toEqual(event);
    expect(mockRepository.save).toHaveBeenCalledWith(event);
  });

  it('should derive confirmed deposit state from event replay', () => {
    const initiatedAt = new Date('2024-01-01T00:00:00Z');
    const confirmedAt = new Date('2024-01-01T00:05:00Z');

    const state = service.deriveDepositState([
      {
        id: 'event-1',
        depositId: 'deposit-1',
        userId: 'user-1',
        vaultId: 'vault-1',
        eventType: DepositEventType.INITIATED,
        amount: 250,
        payload: null,
        transactionHash: null,
        stellarTransactionId: null,
        idempotencyKey: 'key-1',
        occurredAt: initiatedAt,
      },
      {
        id: 'event-2',
        depositId: 'deposit-1',
        userId: 'user-1',
        vaultId: 'vault-1',
        eventType: DepositEventType.CONFIRMED,
        amount: 250,
        payload: null,
        transactionHash: 'tx-123',
        stellarTransactionId: 'stellar-123',
        idempotencyKey: 'key-1',
        occurredAt: confirmedAt,
      },
    ]);

    expect(state).toEqual({
      depositId: 'deposit-1',
      userId: 'user-1',
      vaultId: 'vault-1',
      amount: 250,
      status: DepositStatus.CONFIRMED,
      transactionHash: 'tx-123',
      stellarTransactionId: 'stellar-123',
      idempotencyKey: 'key-1',
      confirmedAt,
    });
  });

  it('should return null when replaying an empty event log', () => {
    expect(service.deriveDepositState([])).toBeNull();
  });
});
