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

export enum RewardStatus {
  ACCRUING = 'ACCRUING',
  CLAIMED = 'CLAIMED',
}

@Entity('rewards')
@Index('idx_rewards_user', ['userId'])
@Index('idx_rewards_vault', ['vaultId'])
@Index('idx_rewards_status', ['status'])
export class Reward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'vault_id' })
  vaultId: string;

  @Column({ name: 'deposit_id' })
  depositId: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    name: 'accrued_amount',
    default: 0,
  })
  accruedAmount: number;

  @Column({ type: 'enum', enum: RewardStatus, default: RewardStatus.ACCRUING })
  status: RewardStatus;

  @Column({
    name: 'claimed_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  claimedAt: Date | null;

  @Column({
    name: 'last_calculated_at',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastCalculatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Vault, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vault_id' })
  vault: Vault;
}
