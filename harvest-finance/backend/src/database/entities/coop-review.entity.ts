import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { CoopOrder } from './coop-order.entity';

@Entity('coop_reviews')
@Unique('uq_coop_reviews_order_reviewer', ['orderId', 'reviewerId'])
@Index('idx_coop_reviews_reviewee', ['revieweeId'])
@Index('idx_coop_reviews_order', ['orderId'])
export class CoopReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'reviewer_id' })
  reviewerId: string;

  @Column({ name: 'reviewee_id' })
  revieweeId: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => CoopOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: CoopOrder;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewee_id' })
  reviewee: User;
}
