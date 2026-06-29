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
 * Persists one active refresh-token session per login event.
 *
 * Enriched with device metadata so users can identify and revoke sessions
 * from the /auth/sessions management endpoints.
 */
@Entity('sessions')
@Index('idx_sessions_user_id', ['user'])
@Index('idx_sessions_expires_at', ['expiresAt'])
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** bcrypt-hashed refresh token — never returned to clients. */
  @Column({ name: 'refresh_token', select: false })
  refreshToken: string;

  /** Raw User-Agent header captured at login time. */
  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent: string | null;

  /** Client IP address captured at login time. */
  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress: string | null;

  /**
   * Human-readable device name derived from the User-Agent string.
   * Examples: "Chrome on Windows", "Safari on iPhone", "Firefox on macOS".
   */
  @Column({ name: 'device_name', type: 'varchar', nullable: true })
  deviceName: string | null;

  /** Timestamp of the most recent token-refresh using this session. */
  @Column({ name: 'last_used_at' })
  lastUsedAt: Date;

  /** Hard expiry — sessions past this date are considered invalid. */
  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
