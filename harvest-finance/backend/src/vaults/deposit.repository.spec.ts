import { Repository } from 'typeorm';
import { DepositRepository } from './deposit.repository';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';

/**
 * Build a minimal Jest mock for TypeORM's Repository<Deposit>.
 * Only the methods actually exercised by DepositRepository are mocked.
 */
function buildMockRepo(): jest.Mocked<
  Pick<Repository<Deposit>, 'findOne' | 'create' | 'update' | 'createQueryBuilder'>
> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

describe('DepositRepository', () => {
  let depositRepository: DepositRepository;
  let mockRepo: ReturnType<typeof buildMockRepo>;

  beforeEach(() => {
    mockRepo = buildMockRepo();
    // Cast to the full Repository type so TypeScript is satisfied when
    // the class constructor receives it via the InjectRepository token.
    depositRepository = new DepositRepository(
      mockRepo as unknown as Repository<Deposit>,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // repository getter
  // ---------------------------------------------------------------------------

  describe('repository getter', () => {
    it('returns the injected underlying repo', () => {
      expect(depositRepository.repository).toBe(mockRepo);
    });
  });

  // ---------------------------------------------------------------------------
  // findByIdempotencyKey
  // ---------------------------------------------------------------------------

  describe('findByIdempotencyKey', () => {
    it('returns the deposit when found', async () => {
      const deposit = { id: 'dep-1', idempotencyKey: 'idem-key', userId: 'user-1' } as Deposit;
      (mockRepo.findOne as jest.Mock).mockResolvedValue(deposit);

      const result = await depositRepository.findByIdempotencyKey('idem-key', 'user-1');

      expect(result).toBe(deposit);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { idempotencyKey: 'idem-key', userId: 'user-1' },
        relations: ['vault'],
      });
    });

    it('returns null when no matching deposit exists', async () => {
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await depositRepository.findByIdempotencyKey('missing-key', 'user-1');

      expect(result).toBeNull();
    });

    it('scopes the query to the supplied userId', async () => {
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      await depositRepository.findByIdempotencyKey('key', 'user-99');

      expect(mockRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-99' }) }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findPendingById
  // ---------------------------------------------------------------------------

  describe('findPendingById', () => {
    it('returns a PENDING deposit when found', async () => {
      const deposit = { id: 'dep-2', status: DepositStatus.PENDING } as Deposit;
      (mockRepo.findOne as jest.Mock).mockResolvedValue(deposit);

      const result = await depositRepository.findPendingById('dep-2');

      expect(result).toBe(deposit);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'dep-2', status: DepositStatus.PENDING },
        relations: ['vault'],
      });
    });

    it('returns null when the deposit does not exist or is not PENDING', async () => {
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await depositRepository.findPendingById('dep-confirmed');

      expect(result).toBeNull();
    });

    it('always filters by PENDING status', async () => {
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      await depositRepository.findPendingById('any-id');

      expect(mockRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: DepositStatus.PENDING }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------

  describe('findById', () => {
    it('returns the deposit regardless of status', async () => {
      const deposit = { id: 'dep-3', status: DepositStatus.CONFIRMED } as Deposit;
      (mockRepo.findOne as jest.Mock).mockResolvedValue(deposit);

      const result = await depositRepository.findById('dep-3');

      expect(result).toBe(deposit);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'dep-3' },
        relations: ['vault'],
      });
    });

    it('returns null when not found', async () => {
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await depositRepository.findById('ghost');

      expect(result).toBeNull();
    });

    it('does not filter by status', async () => {
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      await depositRepository.findById('dep-x');

      const call = (mockRepo.findOne as jest.Mock).mock.calls[0][0];
      expect(call.where).not.toHaveProperty('status');
    });
  });

  // ---------------------------------------------------------------------------
  // findPendingByMemoId
  // ---------------------------------------------------------------------------

  describe('findPendingByMemoId', () => {
    it('returns a PENDING deposit matching the memo id', async () => {
      const deposit = { id: 'memo-uuid', status: DepositStatus.PENDING } as Deposit;
      (mockRepo.findOne as jest.Mock).mockResolvedValue(deposit);

      const result = await depositRepository.findPendingByMemoId('memo-uuid');

      expect(result).toBe(deposit);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'memo-uuid', status: DepositStatus.PENDING },
        relations: ['vault'],
      });
    });

    it('returns null when no pending deposit matches the memo', async () => {
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await depositRepository.findPendingByMemoId('no-match');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findPendingByUserAndAmount
  // ---------------------------------------------------------------------------

  describe('findPendingByUserAndAmount', () => {
    it('returns the oldest PENDING deposit for the user and amount', async () => {
      const deposit = { id: 'dep-4', userId: 'user-2', amount: 500, status: DepositStatus.PENDING } as unknown as Deposit;
      (mockRepo.findOne as jest.Mock).mockResolvedValue(deposit);

      const result = await depositRepository.findPendingByUserAndAmount('user-2', 500);

      expect(result).toBe(deposit);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-2', amount: 500, status: DepositStatus.PENDING },
        relations: ['vault'],
        order: { createdAt: 'ASC' },
      });
    });

    it('returns null when no matching pending deposit exists', async () => {
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await depositRepository.findPendingByUserAndAmount('user-2', 9999);

      expect(result).toBeNull();
    });

    it('orders results by createdAt ASC to get the oldest match', async () => {
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      await depositRepository.findPendingByUserAndAmount('u', 100);

      expect(mockRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'ASC' } }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getUserTotalConfirmedDeposits
  // ---------------------------------------------------------------------------

  describe('getUserTotalConfirmedDeposits', () => {
    /** Helper to build a fluent query-builder chain spy. */
    function buildQbChain(rawResult: any) {
      const getRawOne = jest.fn().mockResolvedValue(rawResult);
      const andWhere = jest.fn().mockReturnValue({ getRawOne });
      const where = jest.fn().mockReturnValue({ andWhere });
      const select = jest.fn().mockReturnValue({ where });
      const qb = { select };
      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      return { getRawOne, andWhere, where, select };
    }

    it('returns the parsed float when the query returns a total', async () => {
      buildQbChain({ total: '1234.56789' });

      const result = await depositRepository.getUserTotalConfirmedDeposits('user-3');

      expect(result).toBeCloseTo(1234.56789);
    });

    it('returns 0 when there are no confirmed deposits (null total)', async () => {
      buildQbChain({ total: null });

      const result = await depositRepository.getUserTotalConfirmedDeposits('user-3');

      expect(result).toBe(0);
    });

    it('returns 0 when getRawOne returns undefined', async () => {
      buildQbChain(undefined);

      const result = await depositRepository.getUserTotalConfirmedDeposits('user-3');

      expect(result).toBe(0);
    });

    it('returns 0 when the total string is falsy (empty string)', async () => {
      buildQbChain({ total: '' });

      const result = await depositRepository.getUserTotalConfirmedDeposits('user-3');

      expect(result).toBe(0);
    });

    it('scopes the aggregation to CONFIRMED status', async () => {
      const { andWhere } = buildQbChain({ total: '0' });

      await depositRepository.getUserTotalConfirmedDeposits('user-3');

      expect(andWhere).toHaveBeenCalledWith('deposit.status = :status', {
        status: DepositStatus.CONFIRMED,
      });
    });

    it('scopes the aggregation to the supplied userId', async () => {
      const { where } = buildQbChain({ total: '0' });

      await depositRepository.getUserTotalConfirmedDeposits('user-42');

      expect(where).toHaveBeenCalledWith('deposit.userId = :userId', {
        userId: 'user-42',
      });
    });

    it('uses the deposit query builder alias', async () => {
      buildQbChain({ total: '0' });

      await depositRepository.getUserTotalConfirmedDeposits('user-3');

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('deposit');
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe('create', () => {
    it('delegates to the underlying repo and returns the entity', () => {
      const partial = { userId: 'user-1', amount: 100, status: DepositStatus.PENDING };
      const entity = { ...partial, id: 'new-id' } as Deposit;
      (mockRepo.create as jest.Mock).mockReturnValue(entity);

      const result = depositRepository.create(partial);

      expect(result).toBe(entity);
      expect(mockRepo.create).toHaveBeenCalledWith(partial);
    });
  });

  // ---------------------------------------------------------------------------
  // updateStatus
  // ---------------------------------------------------------------------------

  describe('updateStatus', () => {
    it('calls repo.update with the depositId and the partial update', async () => {
      (mockRepo.update as jest.Mock).mockResolvedValue({ affected: 1 });

      const update: Partial<Deposit> = {
        status: DepositStatus.CONFIRMED,
        transactionHash: 'tx-hash-abc',
        confirmedAt: new Date('2026-01-01T00:00:00Z'),
      };

      await depositRepository.updateStatus('dep-5', update);

      expect(mockRepo.update).toHaveBeenCalledWith('dep-5', update);
    });

    it('resolves without returning a value (void)', async () => {
      (mockRepo.update as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await depositRepository.updateStatus('dep-6', {
        status: DepositStatus.FAILED,
      });

      expect(result).toBeUndefined();
    });

    it('propagates errors thrown by repo.update', async () => {
      (mockRepo.update as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(
        depositRepository.updateStatus('dep-7', { status: DepositStatus.FAILED }),
      ).rejects.toThrow('DB error');
    });
  });
});
