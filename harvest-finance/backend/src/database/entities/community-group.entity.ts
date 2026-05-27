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

export enum GroupCategory {
  CROP_TYPE = 'CROP_TYPE',
  REGION = 'REGION',
  INTEREST = 'INTEREST',
  GENERAL = 'GENERAL',
}

@Entity('community_groups')
@Index('idx_community_groups_category', ['category'])
@Index('idx_community_groups_creator', ['createdById'])
export class CommunityGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: GroupCategory, default: GroupCategory.GENERAL })
  category: GroupCategory;

  @Column({ nullable: true })
  coverImageUrl: string | null;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @Column({ name: 'member_count', default: 0 })
  memberCount: number;

  @Column({ name: 'is_private', default: false })
  isPrivate: boolean;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;
}
