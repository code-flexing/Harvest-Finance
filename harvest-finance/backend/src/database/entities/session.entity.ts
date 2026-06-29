import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('sessions')
@Index('idx_sessions_family_id', ['familyId'])
@Index('idx_sessions_user_id_revoked', ['user', 'isRevoked'])
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'refresh_token' })
  refreshToken: string;

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

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'last_used_at' })
  lastUsedAt: Date;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
