import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum AchievementType {
  FIRST_DEPOSIT = 'FIRST_DEPOSIT',
  CONSISTENT_SAVER = 'CONSISTENT_SAVER',
  MILESTONE_MASTER = 'MILESTONE_MASTER',
  LONG_TERM_PLANNER = 'LONG_TERM_PLANNER',
}

@Entity('achievements')
@Index('idx_achievements_user', ['userId'])
@Index('idx_achievements_type', ['type'])
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: AchievementType })
  type: AchievementType;

  @Column({ name: 'unlocked_at', type: 'timestamp with time zone' })
  unlockedAt: Date;

  @Column({ nullable: true, type: 'jsonb', name: 'meta_data' })
  metaData: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
