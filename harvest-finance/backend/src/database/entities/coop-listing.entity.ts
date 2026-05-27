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

export enum ListingStatus {
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD',
  RESERVED = 'RESERVED',
  EXPIRED = 'EXPIRED',
  REMOVED = 'REMOVED',
}

export enum ListingCategory {
  CROPS = 'CROPS',
  SEEDS = 'SEEDS',
  TOOLS = 'TOOLS',
  SERVICES = 'SERVICES',
  LIVESTOCK = 'LIVESTOCK',
  OTHER = 'OTHER',
}

export enum DeliveryOption {
  PICKUP_ONLY = 'PICKUP_ONLY',
  DELIVERY = 'DELIVERY',
  BOTH = 'BOTH',
}

@Entity('coop_listings')
@Index('idx_coop_listings_seller', ['sellerId'])
@Index('idx_coop_listings_status', ['status'])
@Index('idx_coop_listings_category', ['category'])
export class CoopListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ListingCategory,
    default: ListingCategory.CROPS,
  })
  category: ListingCategory;

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.ACTIVE })
  status: ListingStatus;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  price: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ default: 'kg' })
  unit: string;

  @Column({
    type: 'enum',
    enum: DeliveryOption,
    default: DeliveryOption.PICKUP_ONLY,
  })
  deliveryOption: DeliveryOption;

  @Column({ nullable: true })
  location: string | null;

  @Column({ nullable: true, name: 'image_url' })
  imageUrl: string | null;

  @Column({
    name: 'expires_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  expiresAt: Date | null;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;
}
