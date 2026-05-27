import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  CommunityPost,
  PostStatus,
} from '../database/entities/community-post.entity';
import { CommunityComment } from '../database/entities/community-comment.entity';
import {
  PostReaction,
  ReactionType,
} from '../database/entities/post-reaction.entity';
import { CommunityGroup } from '../database/entities/community-group.entity';
import {
  GroupMembership,
  MemberRole,
} from '../database/entities/group-membership.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { AchievementsService } from '../achievements/achievements.service';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(CommunityPost)
    private postRepo: Repository<CommunityPost>,
    @InjectRepository(CommunityComment)
    private commentRepo: Repository<CommunityComment>,
    @InjectRepository(PostReaction)
    private reactionRepo: Repository<PostReaction>,
    @InjectRepository(CommunityGroup)
    private groupRepo: Repository<CommunityGroup>,
    @InjectRepository(GroupMembership)
    private membershipRepo: Repository<GroupMembership>,
    private dataSource: DataSource,
    private achievementsService: AchievementsService,
  ) {}

  // ── Posts ──────────────────────────────────────────────────────────────────

  async createPost(
    authorId: string,
    dto: CreatePostDto,
  ): Promise<CommunityPost> {
    if (dto.groupId) {
      const membership = await this.membershipRepo.findOne({
        where: { userId: authorId, groupId: dto.groupId },
      });
      if (!membership) {
        throw new ForbiddenException('You must join this group before posting');
      }
    }

    const post = this.postRepo.create({
      authorId,
      content: dto.content,
      title: dto.title,
      type: dto.type,
      groupId: dto.groupId ?? null,
      tags: dto.tags ?? [],
      imageUrl: dto.imageUrl ?? null,
    });

    const saved = await this.postRepo.save(post);

    // trigger gamification evaluation asynchronously
    this.achievementsService.evaluateAndUnlock(authorId).catch(() => null);

    return saved;
  }

  async getPosts(
    query: QueryPostsDto,
    requesterId?: string,
  ): Promise<{ data: any[]; total: number; page: number }> {
    const { page = 1, limit = 20, groupId, type, tag } = query;

    const qb = this.postRepo
      .createQueryBuilder('post')
      .leftJoin('post.author', 'author')
      .addSelect([
        'author.id',
        'author.firstName',
        'author.lastName',
        'author.profileImageUrl',
      ])
      .where('post.status = :status', { status: PostStatus.ACTIVE })
      .orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (groupId) qb.andWhere('post.groupId = :groupId', { groupId });
    if (type) qb.andWhere('post.type = :type', { type });
    if (tag)
      qb.andWhere(":tag = ANY(string_to_array(post.tags, ','))", { tag });

    const [posts, total] = await qb.getManyAndCount();

    let likedPostIds = new Set<string>();
    if (requesterId) {
      const reactions = await this.reactionRepo.find({
        where: { userId: requesterId },
        select: ['postId'],
      });
      likedPostIds = new Set(reactions.map((r) => r.postId));
    }

    const data = posts.map((p) => ({ ...p, liked: likedPostIds.has(p.id) }));

    return { data, total, page };
  }

  async getPostById(postId: string): Promise<CommunityPost> {
    const post = await this.postRepo.findOne({
      where: { id: postId, status: PostStatus.ACTIVE },
      relations: ['author'],
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async deletePost(postId: string, requesterId: string): Promise<void> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== requesterId) throw new ForbiddenException();
    await this.postRepo.update(postId, { status: PostStatus.REMOVED });
  }

  async toggleReaction(
    postId: string,
    userId: string,
    type: ReactionType,
  ): Promise<{ liked: boolean; likeCount: number }> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.reactionRepo.findOne({
      where: { postId, userId },
    });

    await this.dataSource.transaction(async (manager) => {
      if (existing) {
        await manager.delete(PostReaction, { id: existing.id });
        await manager.decrement(CommunityPost, { id: postId }, 'likeCount', 1);
      } else {
        await manager.save(
          PostReaction,
          this.reactionRepo.create({ postId, userId, type }),
        );
        await manager.increment(CommunityPost, { id: postId }, 'likeCount', 1);
      }
    });

    const updated = await this.postRepo.findOne({ where: { id: postId } });
    return { liked: !existing, likeCount: updated!.likeCount };
  }

  // ── Comments ───────────────────────────────────────────────────────────────

  async addComment(
    postId: string,
    authorId: string,
    dto: CreateCommentDto,
  ): Promise<CommunityComment> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const comment = this.commentRepo.create({
      postId,
      authorId,
      content: dto.content,
      parentId: dto.parentId ?? null,
    });

    await this.dataSource.transaction(async (manager) => {
      await manager.save(CommunityComment, comment);
      await manager.increment(CommunityPost, { id: postId }, 'commentCount', 1);
    });

    return comment;
  }

  async getComments(postId: string): Promise<CommunityComment[]> {
    return this.commentRepo.find({
      where: { postId, isRemoved: false },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });
  }

  async deleteComment(commentId: string, requesterId: string): Promise<void> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== requesterId) throw new ForbiddenException();

    await this.dataSource.transaction(async (manager) => {
      await manager.update(CommunityComment, commentId, { isRemoved: true });
      await manager.decrement(
        CommunityPost,
        { id: comment.postId },
        'commentCount',
        1,
      );
    });
  }

  // ── Groups ─────────────────────────────────────────────────────────────────

  async createGroup(
    createdById: string,
    dto: CreateGroupDto,
  ): Promise<CommunityGroup> {
    const group = this.groupRepo.create({
      createdById,
      name: dto.name,
      description: dto.description ?? null,
      category: dto.category,
      tags: dto.tags ?? [],
      isPrivate: dto.isPrivate ?? false,
      memberCount: 1,
    });

    const saved = await this.groupRepo.save(group);

    // creator auto-joins as admin
    await this.membershipRepo.save(
      this.membershipRepo.create({
        userId: createdById,
        groupId: saved.id,
        role: MemberRole.ADMIN,
      }),
    );

    return saved;
  }

  async getGroups(category?: string): Promise<CommunityGroup[]> {
    const qb = this.groupRepo
      .createQueryBuilder('g')
      .orderBy('g.memberCount', 'DESC');

    if (category) qb.where('g.category = :category', { category });

    return qb.getMany();
  }

  async joinGroup(groupId: string, userId: string): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');

    const existing = await this.membershipRepo.findOne({
      where: { groupId, userId },
    });
    if (existing) throw new ConflictException('Already a member');

    await this.dataSource.transaction(async (manager) => {
      await manager.save(
        GroupMembership,
        this.membershipRepo.create({
          userId,
          groupId,
          role: MemberRole.MEMBER,
        }),
      );
      await manager.increment(
        CommunityGroup,
        { id: groupId },
        'memberCount',
        1,
      );
    });
  }

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    const membership = await this.membershipRepo.findOne({
      where: { groupId, userId },
    });
    if (!membership) throw new NotFoundException('Membership not found');
    if (membership.role === MemberRole.ADMIN)
      throw new ForbiddenException(
        'Group admin cannot leave; transfer ownership first',
      );

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(GroupMembership, { id: membership.id });
      await manager.decrement(
        CommunityGroup,
        { id: groupId },
        'memberCount',
        1,
      );
    });
  }

  async getUserMemberships(userId: string): Promise<GroupMembership[]> {
    return this.membershipRepo.find({
      where: { userId },
      relations: ['group'],
      order: { joinedAt: 'DESC' },
    });
  }

  async getLeaderboard(): Promise<
    { userId: string; postCount: number; commentCount: number; score: number }[]
  > {
    const posts = await this.postRepo
      .createQueryBuilder('p')
      .select('p.authorId', 'userId')
      .addSelect('COUNT(p.id)', 'postCount')
      .where('p.status = :status', { status: PostStatus.ACTIVE })
      .groupBy('p.authorId')
      .getRawMany<{ userId: string; postCount: string }>();

    const comments = await this.commentRepo
      .createQueryBuilder('c')
      .select('c.authorId', 'userId')
      .addSelect('COUNT(c.id)', 'commentCount')
      .where('c.isRemoved = false')
      .groupBy('c.authorId')
      .getRawMany<{ userId: string; commentCount: string }>();

    const commentMap = new Map(
      comments.map((c) => [c.userId, Number(c.commentCount)]),
    );

    return posts
      .map((p) => {
        const pc = Number(p.postCount);
        const cc = commentMap.get(p.userId) ?? 0;
        return {
          userId: p.userId,
          postCount: pc,
          commentCount: cc,
          score: pc * 3 + cc,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }
}
