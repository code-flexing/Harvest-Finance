import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum PostStatus {
  ACTIVE = 'ACTIVE',
  REMOVED = 'REMOVED',
  FLAGGED = 'FLAGGED',
}

export enum PostType {
  GENERAL = 'GENERAL',
  QUESTION = 'QUESTION',
  TIP = 'TIP',
  TRADE = 'TRADE',
}

@Entity('community_posts')
@Index('idx_community_posts_author', ['authorId'])
@Index('idx_community_posts_group', ['groupId'])
@Index('idx_community_posts_status', ['status'])
export class CommunityPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'author_id' })
  authorId: string;

  @Column({ name: 'group_id', nullable: true })
  groupId: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  title: string | null;

  @Column({ type: 'enum', enum: PostType, default: PostType.GENERAL })
  type: PostType;

  @Column({ type: 'enum', enum: PostStatus, default: PostStatus.ACTIVE })
  status: PostStatus;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ name: 'like_count', default: 0 })
  likeCount: number;

  @Column({ name: 'comment_count', default: 0 })
  commentCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @OneToMany('CommunityComment', 'post')
  comments: any[];

  @OneToMany('PostReaction', 'post')
  reactions: any[];
}
