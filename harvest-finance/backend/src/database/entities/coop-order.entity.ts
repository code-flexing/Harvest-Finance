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
import { CoopListing } from './coop-listing.entity';

export enum CoopOrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
}

@Entity('coop_orders')
@Index('idx_coop_orders_buyer', ['buyerId'])
@Index('idx_coop_orders_seller', ['sellerId'])
@Index('idx_coop_orders_listing', ['listingId'])
@Index('idx_coop_orders_status', ['status'])
export class CoopOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'listing_id' })
  listingId: string;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, name: 'total_price' })
  totalPrice: number;

  @Column({
    type: 'enum',
    enum: CoopOrderStatus,
    default: CoopOrderStatus.PENDING,
  })
  status: CoopOrderStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'delivery_address', nullable: true })
  deliveryAddress: string | null;

  @Column({
    name: 'confirmed_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  confirmedAt: Date | null;

  @Column({
    name: 'delivered_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  deliveredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => CoopListing, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'listing_id' })
  listing: CoopListing;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;
}
