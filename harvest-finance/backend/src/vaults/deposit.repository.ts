import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';

@Injectable()
export class DepositRepository {
  constructor(
    @InjectRepository(Deposit)
    private readonly repo: Repository<Deposit>,
  ) {}

  /**
   * Expose the underlying TypeORM repository so callers using an
   * EntityManager (e.g. inside a transaction) can swap it out via
   * manager.withRepository(depositRepository.repository).
   */
  get repository(): Repository<Deposit> {
    return this.repo;
  }

  /**
   * Find a deposit by idempotency key scoped to a specific user.
   * Used to detect duplicate deposit submissions.
   */
  findByIdempotencyKey(
    idempotencyKey: string,
    userId: string,
  ): Promise<Deposit | null> {
    return this.repo.findOne({
      where: { idempotencyKey, userId },
      relations: ['vault'],
    });
  }

  /**
   * Find a deposit that is still PENDING by its primary key.
   * Used when confirming or failing a deposit that has not yet settled.
   */
  findPendingById(id: string): Promise<Deposit | null> {
    return this.repo.findOne({
      where: { id, status: DepositStatus.PENDING },
      relations: ['vault'],
    });
  }

  /**
   * Find a deposit by its primary key regardless of status.
   * Used when re-fetching a deposit after an update.
   */
  findById(id: string): Promise<Deposit | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['vault'],
    });
  }

  /**
   * Find a PENDING deposit whose id matches the supplied memo string.
   * On the Stellar network the transaction memo carries the deposit UUID,
   * so this lets payment-received handlers locate the right row.
   */
  findPendingByMemoId(memoId: string): Promise<Deposit | null> {
    return this.repo.findOne({
      where: { id: memoId, status: DepositStatus.PENDING },
      relations: ['vault'],
    });
  }

  /**
   * Find the oldest PENDING deposit for a given user and amount.
   * Used as a fallback matching strategy when no memo is present:
   * the payment is matched against the earliest pending deposit that
   * has the same amount from the same user.
   */
  findPendingByUserAndAmount(
    userId: string,
    amount: number,
  ): Promise<Deposit | null> {
    return this.repo.findOne({
      where: { userId, amount, status: DepositStatus.PENDING },
      relations: ['vault'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Return the sum of all CONFIRMED deposit amounts for a user.
   * Returns 0 when the user has no confirmed deposits.
   */
  async getUserTotalConfirmedDeposits(userId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('deposit')
      .select('SUM(deposit.amount)', 'total')
      .where('deposit.userId = :userId', { userId })
      .andWhere('deposit.status = :status', { status: DepositStatus.CONFIRMED })
      .getRawOne();

    return result?.total ? parseFloat(result.total) : 0;
  }

  /**
   * Instantiate (but do not persist) a new Deposit entity.
   * Mirrors Repository.create so callers do not need to hold a raw repo reference.
   */
  create(data: Partial<Deposit>): Deposit {
    return this.repo.create(data as any);
  }

  /**
   * Apply a partial update to a deposit row identified by depositId.
   * Typical usage: flip status to CONFIRMED/FAILED and record hashes/timestamps.
   */
  async updateStatus(depositId: string, update: Partial<Deposit>): Promise<void> {
    await this.repo.update(depositId, update as any);
  }
}
