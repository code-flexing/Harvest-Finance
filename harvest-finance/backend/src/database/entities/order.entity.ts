import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  ForeignKey,
} from 'typeorm';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';
import { Verification } from './verification.entity';

/**
 * Order status in the agricultural marketplace
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  IN_ESCROW = 'IN_ESCROW',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

/**
 * Order entity representing agricultural product orders
 *
 * Relationships:
 * - Many Orders belong to one User (farmer/seller)
 * - Many Orders belong to one User (buyer)
 * - One Order can have one Transaction
 * - One Order can have one Verification
 */
@Entity('orders')
@Index('idx_orders_farmer_id', ['farmerId'])
@Index('idx_orders_buyer_id', ['buyerId'])
@Index('idx_orders_status', ['status'])
@Index('idx_orders_crop_type', ['cropType'])
@Index('idx_orders_created_at', ['createdAt'])
@Index('idx_orders_status_created', ['status', 'createdAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'farmer_id' })
  @Index('idx_orders_farmer_id')
  farmerId: string;

  @Column({ name: 'buyer_id' })
  @Index('idx_orders_buyer_id')
  buyerId: string;

  @Column({ name: 'crop_type' })
  cropType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ name: 'quantity_unit', default: 'kg' })
  quantityUnit: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ nullable: true })
  description: string | null;

  @Column({ name: 'delivery_address', nullable: true })
  deliveryAddress: string | null;

  @Column({ name: 'expected_delivery_date', type: 'date', nullable: true })
  expectedDeliveryDate: Date | null;

  @Column({ name: 'escrow_tx_hash', nullable: true })
  escrowTxHash: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships

  /** The farmer selling the crops */
  @ManyToOne(() => User, (user) => user.ordersAsFarmer)
  @JoinColumn({ name: 'farmer_id' })
  farmer: User;

  /** The buyer purchasing the crops */
  @ManyToOne(() => User, (user) => user.ordersAsBuyer)
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  /** Transaction associated with this order (escrow payment) */
  @OneToOne(() => Transaction, (transaction) => transaction.order)
  transaction: Transaction;

  /** Verification of the order (inspector approval) */
  @OneToOne(() => Verification, (verification) => verification.order)
  verification: Verification;
}
