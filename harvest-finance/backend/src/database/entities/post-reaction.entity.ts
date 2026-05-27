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
import { CommunityPost } from './community-post.entity';

export enum ReactionType {
  LIKE = 'LIKE',
  HELPFUL = 'HELPFUL',
  INSIGHTFUL = 'INSIGHTFUL',
}

@Entity('post_reactions')
@Unique('uq_post_reactions_user_post', ['userId', 'postId'])
@Index('idx_post_reactions_post', ['postId'])
export class PostReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'post_id' })
  postId: string;

  @Column({ type: 'enum', enum: ReactionType, default: ReactionType.LIKE })
  type: ReactionType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => CommunityPost, (post) => post.reactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  post: CommunityPost;
}
