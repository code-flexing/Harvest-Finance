import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Vault } from './vault.entity';

/**
 * Deposit status
 */
export enum DepositStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

/**
 * Deposit entity representing user deposits into vaults
 *
 * Relationships:
 * - One Deposit belongs to one User (depositor)
 * - One Deposit belongs to one Vault
 */
@Entity('deposits')
@Index('idx_deposits_user', ['userId'])
@Index('idx_deposits_vault', ['vaultId'])
@Index('idx_deposits_status', ['status'])
@Index('idx_deposits_idempotency', ['idempotencyKey'], { unique: true })
export class Deposit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'vault_id' })
  vaultId: string;

  @Column({
    type: 'enum',
    enum: DepositStatus,
    default: DepositStatus.PENDING,
  })
  status: DepositStatus;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
  })
  amount: number;

  @Column({ type: 'text', nullable: true })
  transactionHash: string | null;

  @Column({ type: 'text', nullable: true })
  stellarTransactionId: string | null;

  @Column({
    type: 'timestamp with time zone',
    name: 'confirmed_at',
    nullable: true,
  })
  confirmedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'text', name: 'idempotency_key', nullable: true })
  idempotencyKey: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships

  /** User who made the deposit */
  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Vault where deposit was made */
  @ManyToOne(() => Vault, (vault) => vault.deposits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vault_id' })
  vault: Vault;
}
