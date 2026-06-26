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

@Entity('user_oauth_links')
@Index('idx_user_oauth_links_provider_id', ['oauthProvider', 'oauthId'], { unique: true })
@Index('idx_user_oauth_links_user_id', ['userId'])
export class UserOAuthLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'oauth_provider' })
  oauthProvider: string; // 'google', 'github', etc.

  @Column({ name: 'oauth_id' })
  oauthId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.oauthLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
