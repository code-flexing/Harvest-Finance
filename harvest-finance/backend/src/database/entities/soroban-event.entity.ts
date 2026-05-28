import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum SorobanEventType {
  CONTRACT = 'contract',
  SYSTEM = 'system',
  DIAGNOSTIC = 'diagnostic',
}

@Entity('soroban_events')
@Index('idx_soroban_events_contract', ['contractId'])
@Index('idx_soroban_events_type', ['type'])
@Index('idx_soroban_events_ledger', ['ledger'])
@Index('idx_soroban_events_event_id', ['eventId'], { unique: true })
@Index('idx_soroban_events_tx', ['transactionHash'])
@Index('idx_soroban_events_query', [
  'contractId',
  'type',
  'ledger',
  'pagingToken',
])
export class SorobanEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'varchar', length: 128 })
  eventId: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: SorobanEventType,
    default: SorobanEventType.CONTRACT,
  })
  type: SorobanEventType;

  @Column({ name: 'contract_id', type: 'varchar', length: 128, nullable: true })
  contractId: string | null;

  @Column({ name: 'ledger', type: 'bigint' })
  ledger: number;

  @Column({ name: 'ledger_closed_at', type: 'timestamp with time zone' })
  ledgerClosedAt: Date;

  @Column({
    name: 'transaction_hash',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  transactionHash: string | null;

  @Column({ name: 'paging_token', type: 'varchar', length: 128 })
  pagingToken: string;

  @Column({ name: 'topics', type: 'jsonb', default: () => "'[]'" })
  topics: string[];

  @Column({ name: 'value', type: 'jsonb', nullable: true })
  value: unknown;

  @Column({
    name: 'in_successful_contract_call',
    type: 'boolean',
    default: true,
  })
  inSuccessfulContractCall: boolean;

  @CreateDateColumn({ name: 'indexed_at' })
  indexedAt: Date;
}
