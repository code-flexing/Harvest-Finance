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

/**
 * Types of notifications in the system
 */
export enum NotificationType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  REWARD = 'REWARD',
  SYSTEM = 'SYSTEM',
  VAULT_CREATED = 'VAULT_CREATED',
  LARGE_TRANSACTION = 'LARGE_TRANSACTION',
  ERROR = 'ERROR',
  INSURANCE = 'INSURANCE',
  APPROVAL = 'APPROVAL',
}

/**
 * Notification entity for keeping users and admins informed
 */
@Entity('notifications')
@Index('idx_notifications_user_id', ['userId'])
@Index('idx_notifications_admin_only', ['adminOnly'])
@Index('idx_notifications_read', ['isRead'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'admin_only', default: false })
  adminOnly: boolean;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
