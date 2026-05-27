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
import { CommunityGroup } from './community-group.entity';

export enum MemberRole {
  MEMBER = 'MEMBER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

@Entity('group_memberships')
@Unique('uq_group_memberships_user_group', ['userId', 'groupId'])
@Index('idx_group_memberships_user', ['userId'])
@Index('idx_group_memberships_group', ['groupId'])
export class GroupMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'group_id' })
  groupId: string;

  @Column({ type: 'enum', enum: MemberRole, default: MemberRole.MEMBER })
  role: MemberRole;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => CommunityGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: CommunityGroup;
}
