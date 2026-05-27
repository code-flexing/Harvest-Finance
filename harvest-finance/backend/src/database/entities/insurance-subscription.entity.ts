import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { InsurancePlan } from './insurance-plan.entity';

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING',
}

@Entity('insurance_subscriptions')
@Index('idx_ins_subs_user', ['userId'])
@Index('idx_ins_subs_plan', ['planId'])
export class InsuranceSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'plan_id' })
  planId: string;

  @ManyToOne(() => InsurancePlan, (p) => p.subscriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'plan_id' })
  plan: InsurancePlan;

  /** The crop type the farmer selected when subscribing */
  @Column({ length: 60, name: 'crop_type' })
  cropType: string;

  /** Dollar value the farmer wants to insure */
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    name: 'insured_value',
  })
  insuredValue: number;

  /** Calculated monthly premium = insuredValue × premiumRate / 12 */
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    name: 'monthly_premium',
  })
  monthlyPremium: number;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ type: 'date', name: 'coverage_start' })
  coverageStart: Date;

  @Column({ type: 'date', name: 'coverage_end' })
  coverageEnd: Date;

  /** Optional Farm Vault ID linked for automatic premium deductions */
  @Column({ name: 'farm_vault_id', nullable: true })
  farmVaultId: string | null;

  /** Risk score that was computed at subscription time (0 – 100) */
  @Column({
    type: 'smallint',
    name: 'risk_score_at_subscription',
    default: 0,
  })
  riskScoreAtSubscription: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
