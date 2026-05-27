import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Order } from './order.entity';
import { User } from './user.entity';

/**
 * Verification status for agricultural orders
 */
export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

/**
 * Verification entity representing inspector approvals for orders
 *
 * Relationships:
 * - Many Verifications can belong to one Order (but typically one-to-one)
 * - Many Verifications belong to one User (inspector)
 *
 * Constraints:
 * - inspector_id references Users table
 * - order_id references Orders table
 */
@Entity('verifications')
@Index('idx_verifications_order_id', ['orderId'], { unique: true })
@Index('idx_verifications_inspector_id', ['inspectorId'])
@Index('idx_verifications_status', ['status'])
@Index('idx_verifications_created_at', ['createdAt'])
export class Verification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'inspector_id' })
  inspectorId: string;

  @Column({ name: 'proof_hash' })
  proofHash: string;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  @Column({ nullable: true })
  notes: string | null;

  @Column({ name: 'inspection_date', type: 'date', nullable: true })
  inspectionDate: Date | null;

  @Column({ name: 'crop_quality', nullable: true })
  cropQuality: string | null;

  @Column({
    name: 'quantity_verified',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  quantityVerified: number | null;

  @Column({
    name: 'verification_documents',
    type: 'text',
    array: true,
    nullable: true,
  })
  verificationDocuments: string[] | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'rejected_at', type: 'timestamp', nullable: true })
  rejectedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships

  /** The order being verified */
  @OneToOne(() => Order, (order) => order.verification)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  /** The inspector who performed the verification */
  @ManyToOne(() => User, (user) => user.verifications)
  @JoinColumn({ name: 'inspector_id' })
  inspector: User;
}
