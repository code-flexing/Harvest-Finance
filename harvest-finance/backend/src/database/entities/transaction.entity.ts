import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
  ForeignKey,
} from 'typeorm';
import { Order } from './order.entity';

/**
 * Transaction status in the Stellar blockchain
 */
export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Transaction type for Stellar payments
 */
export enum TransactionType {
  ESCROW_DEPOSIT = 'ESCROW_DEPOSIT',
  ESCROW_RELEASE = 'ESCROW_RELEASE',
  ESCROW_REFUND = 'ESCROW_REFUND',
  DIRECT_PAYMENT = 'DIRECT_PAYMENT',
}

/**
 * Transaction entity representing Stellar blockchain transactions
 *
 * Relationships:
 * - One Transaction belongs to one Order
 *
 * Constraints:
 * - stellar_tx_hash must be unique
 */
@Entity('transactions')
@Index('idx_transactions_order_id', ['orderId'])
@Index('idx_transactions_status', ['status'])
@Index('idx_transactions_stellar_tx_hash', ['stellarTxHash'], { unique: true })
@Index('idx_transactions_created_at', ['createdAt'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'stellar_tx_hash', unique: true })
  stellarTxHash: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'asset_code', default: 'XLM' })
  assetCode: string;

  @Column({ name: 'asset_issuer', nullable: true })
  assetIssuer: string | null;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.ESCROW_DEPOSIT,
  })
  type: TransactionType;

  @Column({ name: 'source_account', nullable: true })
  sourceAccount: string | null;

  @Column({ name: 'destination_account', nullable: true })
  destinationAccount: string | null;

  @Column({ name: 'stellar_memo', nullable: true })
  stellarMemo: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt: Date | null;

  @Column({ nullable: true })
  memo: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships

  /** The order this transaction is associated with */
  @OneToOne(() => Order, (order) => order.transaction)
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
