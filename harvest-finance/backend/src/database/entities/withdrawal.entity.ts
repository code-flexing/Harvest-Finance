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
 * Withdrawal status
 */
export enum WithdrawalStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

/**
 * Withdrawal entity representing user withdrawals from vaults
 */
@Entity('withdrawals')
@Index('idx_withdrawals_user', ['userId'])
@Index('idx_withdrawals_vault', ['vaultId'])
@Index('idx_withdrawals_status', ['status'])
export class Withdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'vault_id' })
  vaultId: string;

  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
  })
  amount: number;

  @Column({ type: 'text', nullable: true })
  transactionHash: string | null;

  @Column({
    type: 'timestamp with time zone',
    name: 'confirmed_at',
    nullable: true,
  })
  confirmedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships

  /** User who made the withdrawal */
  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Vault where withdrawal was made */
  @ManyToOne(() => Vault, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vault_id' })
  vault: Vault;
}
