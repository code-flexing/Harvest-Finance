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
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
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
@Index('idx_sessions_family_id', ['familyId'])
@Index('idx_sessions_user_id_revoked', ['user', 'isRevoked'])
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
  /**
   * Groups all tokens issued from a single login event (token rotation chain).
   * If any revoked token in the family is replayed, the entire family is revoked.
   */
  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  /**
   * True once the token has been consumed (rotated) or explicitly revoked.
   */
  @Column({ name: 'is_revoked', default: false })
  isRevoked: boolean;

  /**
   * UUID of the session record that replaced this one after rotation.
   * Null until this token is consumed by a /auth/refresh call.
   */
  @Column({ name: 'replaced_by', type: 'uuid', nullable: true })
  replacedBy: string | null;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

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
