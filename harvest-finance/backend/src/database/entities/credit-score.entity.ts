import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * CreditScore history entry for tracking score changes
 */
export interface CreditScoreHistoryEntry {
  date: Date;
  score: number;
  reason: string;
  orderId?: string;
  verificationId?: string;
}

/**
 * CreditScore entity representing farmer credit ratings
 *
 * Relationships:
 * - One CreditScore belongs to one User (farmer)
 *
 * PostgreSQL-specific features:
 * - history field uses JSONB for flexible data storage
 */
@Entity('credit_scores')
@Index('idx_credit_scores_farmer_id', ['farmerId'], { unique: true })
@Index('idx_credit_scores_score', ['score'])
export class CreditScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'farmer_id', unique: true })
  farmerId: string;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ name: 'total_transactions', type: 'int', default: 0 })
  totalTransactions: number;

  @Column({ name: 'successful_transactions', type: 'int', default: 0 })
  successfulTransactions: number;

  @Column({ name: 'failed_transactions', type: 'int', default: 0 })
  failedTransactions: number;

  @Column({
    name: 'total_volume',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  totalVolume: number;

  @Column({
    name: 'average_rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
  })
  averageRating: number;

  @Column({ name: 'total_ratings', type: 'int', default: 0 })
  totalRatings: number;

  @Column({ type: 'jsonb', default: [] })
  history: CreditScoreHistoryEntry[];

  @Column({ name: 'last_updated', type: 'timestamp', default: null })
  lastUpdated: Date | null;

  @Column({ name: 'last_order_id', nullable: true })
  lastOrderId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships

  /** The farmer this credit score belongs to */
  @OneToOne(() => User, (user) => user.creditScore)
  @JoinColumn({ name: 'farmer_id' })
  farmer: User;
}
