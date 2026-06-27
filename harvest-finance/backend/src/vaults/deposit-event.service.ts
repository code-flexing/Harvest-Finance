import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import {
  DepositEvent,
  DepositEventType,
} from '../database/entities/deposit-event.entity';
import { DepositStatus } from '../database/entities/deposit.entity';
import { DepositEventResponseDto } from './dto/deposit-event-response.dto';

export interface AppendDepositEventInput {
  depositId: string;
  userId: string;
  vaultId: string;
  eventType: DepositEventType;
  amount: number;
  payload?: Record<string, unknown> | null;
  transactionHash?: string | null;
  stellarTransactionId?: string | null;
  idempotencyKey?: string | null;
}

export interface DerivedDepositState {
  depositId: string;
  userId: string;
  vaultId: string;
  amount: number;
  status: DepositStatus;
  transactionHash: string | null;
  stellarTransactionId: string | null;
  idempotencyKey: string | null;
  confirmedAt: Date | null;
}

@Injectable()
export class DepositEventService {
  constructor(
    @InjectRepository(DepositEvent)
    private readonly depositEventRepository: Repository<DepositEvent>,
  ) {}

  async appendEvent(
    input: AppendDepositEventInput,
    manager?: EntityManager,
  ): Promise<DepositEvent> {
    const repository = manager
      ? manager.getRepository(DepositEvent)
      : this.depositEventRepository;

    const event = repository.create({
      depositId: input.depositId,
      userId: input.userId,
      vaultId: input.vaultId,
      eventType: input.eventType,
      amount: input.amount,
      payload: input.payload ?? null,
      transactionHash: input.transactionHash ?? null,
      stellarTransactionId: input.stellarTransactionId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
    });

    return repository.save(event);
  }

  async getDepositHistory(depositId: string): Promise<DepositEvent[]> {
    return this.depositEventRepository.find({
      where: { depositId },
      order: { occurredAt: 'ASC' },
    });
  }

  async getUserDepositHistory(
    userId: string,
    vaultId?: string,
  ): Promise<DepositEvent[]> {
    const where: FindOptionsWhere<DepositEvent> = { userId };
    if (vaultId) {
      where.vaultId = vaultId;
    }

    return this.depositEventRepository.find({
      where,
      order: { occurredAt: 'DESC' },
    });
  }

  async getVaultDepositHistory(vaultId: string): Promise<DepositEvent[]> {
    return this.depositEventRepository.find({
      where: { vaultId },
      order: { occurredAt: 'DESC' },
    });
  }

  deriveDepositState(events: DepositEvent[]): DerivedDepositState | null {
    if (events.length === 0) {
      return null;
    }

    const ordered = [...events].sort(
      (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
    );
    const initiated = ordered.find(
      (event) => event.eventType === DepositEventType.INITIATED,
    );

    if (!initiated) {
      return null;
    }

    let status = DepositStatus.PENDING;
    let transactionHash = initiated.transactionHash;
    let stellarTransactionId = initiated.stellarTransactionId;
    let confirmedAt: Date | null = null;

    for (const event of ordered) {
      switch (event.eventType) {
        case DepositEventType.CONFIRMED:
          status = DepositStatus.CONFIRMED;
          transactionHash = event.transactionHash ?? transactionHash;
          stellarTransactionId =
            event.stellarTransactionId ?? stellarTransactionId;
          confirmedAt = event.occurredAt;
          break;
        case DepositEventType.FAILED:
          status = DepositStatus.FAILED;
          break;
        case DepositEventType.REFUNDED:
          status = DepositStatus.REFUNDED;
          break;
        default:
          break;
      }
    }

    return {
      depositId: initiated.depositId,
      userId: initiated.userId,
      vaultId: initiated.vaultId,
      amount: Number(initiated.amount),
      status,
      transactionHash,
      stellarTransactionId,
      idempotencyKey: initiated.idempotencyKey,
      confirmedAt,
    };
  }

  mapEventToResponse(event: DepositEvent): DepositEventResponseDto {
    return {
      id: event.id,
      depositId: event.depositId,
      userId: event.userId,
      vaultId: event.vaultId,
      eventType: event.eventType,
      amount: Number(event.amount),
      payload: event.payload,
      transactionHash: event.transactionHash,
      stellarTransactionId: event.stellarTransactionId,
      idempotencyKey: event.idempotencyKey,
      occurredAt: event.occurredAt,
    };
  }
}
