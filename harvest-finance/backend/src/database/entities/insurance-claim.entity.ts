import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Vault } from './vault.entity';
import { User } from './user.entity';

export enum InsuranceClaimStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

/**
 * Records a payout claim from the insurance fund to a depositor.
 * The claim is created during an incident workflow and later updated
 * when the payout is processed on‑chain.
 */
@Entity('insurance_claims')
@Index('idx_insurance_claim_vault', ['vaultId'])
@Index('idx_insurance_claim_user', ['depositorId'])
export class InsuranceClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vault_id' })
  vaultId: string;

  @ManyToOne(() => Vault, (vault) => vault.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vault_id' })
  vault: Vault;

  @Column({ name: 'depositor_id' })
  depositorId: string;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'depositor_id' })
  depositor: User;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  lossAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  payoutAmount: number;

  @Column({ type: 'enum', enum: InsuranceClaimStatus, default: InsuranceClaimStatus.PENDING })
  status: InsuranceClaimStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
