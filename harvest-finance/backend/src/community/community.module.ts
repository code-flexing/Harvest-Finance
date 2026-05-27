import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { CommunityPost } from '../database/entities/community-post.entity';
import { CommunityComment } from '../database/entities/community-comment.entity';
import { PostReaction } from '../database/entities/post-reaction.entity';
import { CommunityGroup } from '../database/entities/community-group.entity';
import { GroupMembership } from '../database/entities/group-membership.entity';
import { AuthModule } from '../auth/auth.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommunityPost,
      CommunityComment,
      PostReaction,
      CommunityGroup,
      GroupMembership,
    ]),
    AuthModule,
    AchievementsModule,
  ],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
