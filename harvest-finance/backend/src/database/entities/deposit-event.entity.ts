import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum DepositEventType {
  INITIATED = 'INITIATED',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

/**
 * Append-only event log for deposit lifecycle changes.
 * State is derived by replaying events; rows are never updated or deleted.
 */
@Entity('deposit_events')
@Index('idx_deposit_events_deposit', ['depositId'])
@Index('idx_deposit_events_user', ['userId'])
@Index('idx_deposit_events_vault', ['vaultId'])
@Index('idx_deposit_events_type', ['eventType'])
@Index('idx_deposit_events_occurred_at', ['occurredAt'])
export class DepositEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'deposit_id', type: 'uuid' })
  depositId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'vault_id', type: 'uuid' })
  vaultId: string;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: DepositEventType,
  })
  eventType: DepositEventType;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
  })
  amount: number;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ name: 'transaction_hash', type: 'text', nullable: true })
  transactionHash: string | null;

  @Column({ name: 'stellar_transaction_id', type: 'text', nullable: true })
  stellarTransactionId: string | null;

  @Column({ name: 'idempotency_key', type: 'text', nullable: true })
  idempotencyKey: string | null;

  @CreateDateColumn({ name: 'occurred_at' })
  occurredAt: Date;
}
