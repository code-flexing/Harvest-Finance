import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum SecurityEventType {
  /** A refresh token family was revoked because a previously consumed token was replayed. */
  REFRESH_TOKEN_REUSE = 'REFRESH_TOKEN_REUSE',
  /** A single session was explicitly revoked by the user. */
  SESSION_REVOKED = 'SESSION_REVOKED',
  /** All sessions were revoked (e.g., password change, admin action). */
  ALL_SESSIONS_REVOKED = 'ALL_SESSIONS_REVOKED',
  /** User account was locked after too many failed login attempts. */
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
}

/**
 * Immutable audit record for security-sensitive events.
 * Never update or delete rows from this table.
 */
@Entity('security_events')
@Index('idx_security_events_user_id', ['userId'])
@Index('idx_security_events_type', ['type'])
@Index('idx_security_events_created_at', ['createdAt'])
export class SecurityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'enum', enum: SecurityEventType })
  type: SecurityEventType;

  /** Human-readable description of the event. */
  @Column('text')
  message: string;

  /** Arbitrary JSON metadata (IP address, family ID, session IDs, etc.). */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
