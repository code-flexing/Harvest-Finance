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
import { Vault } from './vault.entity';
import { User } from './user.entity';

export enum InsuranceClaimStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
}

@Entity('insurance_claims')
@Index('idx_insurance_claims_vault', ['vaultId'])
@Index('idx_insurance_claims_depositor', ['depositorId'])
@Index('idx_insurance_claims_status', ['status'])
export class InsuranceClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vault_id' })
  vaultId: string;

  @Column({ name: 'depositor_id' })
  depositorId: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
  })
  lossAmount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
  })
  payoutAmount: number;

  @Column({
    type: 'enum',
    enum: InsuranceClaimStatus,
    default: InsuranceClaimStatus.PENDING,
  })
  status: InsuranceClaimStatus;

  @Column({ type: 'text', nullable: true, name: 'transaction_hash' })
  transactionHash: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Vault, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vault_id' })
  vault: Vault;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'depositor_id' })
  depositor: User;
}