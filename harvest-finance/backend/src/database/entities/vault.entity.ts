import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  ManyToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Deposit } from './deposit.entity';
import { VaultApproval } from './vault-approval.entity';

export enum VaultType {
  CROP_PRODUCTION = 'CROP_PRODUCTION',
  EQUIPMENT_FINANCING = 'EQUIPMENT_FINANCING',
  LAND_ACQUISITION = 'LAND_ACQUISITION',
  INSURANCE_FUND = 'INSURANCE_FUND',
  EMERGENCY_FUND = 'EMERGENCY_FUND',
}

/**
 * Lifecycle states for a Vault and the valid transitions between them.
 *
 * State transition table:
 * ┌────────────────┬──────────────────────────────────────────────────────────────────┐
 * │ From           │ To (trigger)                                                     │
 * ├────────────────┼──────────────────────────────────────────────────────────────────┤
 * │ ACTIVE         │ → INACTIVE      (owner deactivates / vault expires at maturity)  │
 * │ ACTIVE         │ → FROZEN        (admin freezes due to compliance or dispute)     │
 * │ ACTIVE         │ → FULL_CAPACITY (totalDeposits >= maxCapacity, see isFullCapacity)│
 * │ INACTIVE       │ → ACTIVE        (owner re-activates the vault)                   │
 * │ FROZEN         │ → ACTIVE        (admin unfreezes after issue is resolved)         │
 * │ FULL_CAPACITY  │ → ACTIVE        (a deposit is withdrawn, freeing space)           │
 * └────────────────┴──────────────────────────────────────────────────────────────────┘
 *
 * ASCII diagram:
 *
 *                 ┌──────────────────────────────────────┐
 *                 │                                      ▼
 *   deactivate  INACTIVE ◄──── ACTIVE ────► FROZEN  (admin freeze)
 *   re-activate   │              ▲  │                    │
 *                 └──────────────┘  └──► FULL_CAPACITY   │ (admin unfreeze)
 *                                         │              │
 *                                         └──────────────┘
 *                                    (withdrawal frees space)
 *
 * Notes:
 *  - FULL_CAPACITY is set automatically; it is NOT a manual admin action.
 *  - FROZEN takes precedence — a frozen vault cannot accept deposits even
 *    if capacity is available.
 *  - Transitions to FROZEN are always permitted regardless of current state
 *    to allow emergency intervention.
 */
export enum VaultStatus {
  /** Vault is open and accepting deposits up to maxCapacity. */
  ACTIVE = 'ACTIVE',

  /** Vault has been deactivated by its owner or reached its maturityDate.
   *  No new deposits are accepted; existing funds remain accessible. */
  INACTIVE = 'INACTIVE',

  /** Vault is locked by an administrator (e.g. compliance review or dispute).
   *  All deposit and withdrawal operations are blocked until unfrozen. */
  FROZEN = 'FROZEN',

  /** totalDeposits >= maxCapacity. Set automatically by the deposit service.
   *  Transitions back to ACTIVE once enough funds are withdrawn to free capacity. */
  FULL_CAPACITY = 'FULL_CAPACITY',
}

@Entity('vaults')
@Index('idx_vaults_owner', ['ownerId'])
@Index('idx_vaults_type', ['type'])
@Index('idx_vaults_status', ['status'])
export class Vault {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column({ type: 'enum', enum: VaultType, default: VaultType.CROP_PRODUCTION })
  type: VaultType;

  @Column({ type: 'enum', enum: VaultStatus, default: VaultStatus.ACTIVE })
  status: VaultStatus;

  @Column({ name: 'vault_name', length: 100 })
  vaultName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 20, default: 'HVF' })
  symbol: string;

  @Column({ name: 'asset_pair', length: 50, default: 'XLM/USDC' })
  assetPair: string;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  totalDeposits: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  maxCapacity: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  interestRate: number;

  @Column({
    name: 'compounding_frequency',
    type: 'varchar',
    length: 20,
    default: 'daily',
  })
  compoundingFrequency: 'daily' | 'weekly' | 'monthly';

  @Column({
    type: 'timestamp with time zone',
    name: 'maturity_date',
    nullable: true,
  })
  maturityDate: Date | null;

  @Column({
    type: 'timestamp with time zone',
    name: 'lock_period_end',
    nullable: true,
  })
  lockPeriodEnd: Date | null;

  @Column({ name: 'is_public', default: true })
  isPublic: boolean;

  @Column({ name: 'requires_multi_signature', default: false })
  requiresMultiSignature: boolean;

  @Column({ name: 'approval_threshold', type: 'int', default: 1 })
  approvalThreshold: number;

  @Column({ name: 'current_approvals', type: 'int', default: 0 })
  currentApprovals: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => Deposit, (deposit) => deposit.vault)
  deposits: Deposit[];

  @OneToMany(() => VaultApproval, (approval) => approval.vault)
  approvals: VaultApproval[];

  get availableCapacity(): number {
    return Number(this.maxCapacity) - Number(this.totalDeposits);
  }

  get utilizationPercentage(): number {
    if (Number(this.maxCapacity) === 0) return 0;
    return (Number(this.totalDeposits) / Number(this.maxCapacity)) * 100;
  }

  get isFullCapacity(): boolean {
    return Number(this.totalDeposits) >= Number(this.maxCapacity);
  }

  get requiresApproval(): boolean {
    return this.requiresMultiSignature && this.currentApprovals < this.approvalThreshold;
  }

  get approvalStatus(): string {
    if (!this.requiresMultiSignature) return 'NOT_REQUIRED';
    if (this.currentApprovals >= this.approvalThreshold) return 'APPROVED';
    return 'PENDING';
  }
}
