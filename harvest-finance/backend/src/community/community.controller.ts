import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommunityService } from './community.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { ReactionType } from '../database/entities/post-reaction.entity';

@ApiTags('community')
@Controller({
  path: 'community',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunityController {
  constructor(private readonly service: CommunityService) {}

  // ── Feed / Posts ───────────────────────────────────────────────────────────

  @Post('posts')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create a community post' })
  createPost(@Request() req: any, @Body() dto: CreatePostDto) {
    return this.service.createPost(req.user.id, dto);
  }

  @Get('posts')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Get community feed (paginated)' })
  getPosts(@Request() req: any, @Query() query: QueryPostsDto) {
    return this.service.getPosts(query, req.user.id);
  }

  @Get('posts/:id')
  @ApiOperation({ summary: 'Get single post' })
  getPost(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getPostById(id);
  }

  @Delete('posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete own post' })
  deletePost(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.deletePost(id, req.user.id);
  }

  @Post('posts/:id/react')
  @ApiOperation({ summary: 'Toggle like/reaction on a post' })
  @ApiQuery({ name: 'type', enum: ReactionType, required: false })
  react(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('type') type: ReactionType = ReactionType.LIKE,
  ) {
    return this.service.toggleReaction(id, req.user.id, type);
  }

  // ── Comments ───────────────────────────────────────────────────────────────

  @Post('posts/:id/comments')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Add comment to a post' })
  addComment(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.service.addComment(id, req.user.id, dto);
  }

  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  getComments(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getComments(id);
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete own comment' })
  deleteComment(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteComment(id, req.user.id);
  }

  // ── Groups ─────────────────────────────────────────────────────────────────

  @Post('groups')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create a community group' })
  createGroup(@Request() req: any, @Body() dto: CreateGroupDto) {
    return this.service.createGroup(req.user.id, dto);
  }

  @Get('groups')
  @ApiOperation({ summary: 'List groups (optionally filter by category)' })
  @ApiQuery({ name: 'category', required: false })
  getGroups(@Query('category') category?: string) {
    return this.service.getGroups(category);
  }

  @Post('groups/:id/join')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Join a group' })
  joinGroup(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.joinGroup(id, req.user.id);
  }

  @Delete('groups/:id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave a group' })
  leaveGroup(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.leaveGroup(id, req.user.id);
  }

  @Get('my/groups')
  @ApiOperation({ summary: 'Get groups the current user has joined' })
  myGroups(@Request() req: any) {
    return this.service.getUserMemberships(req.user.id);
  }

  // ── Gamification ───────────────────────────────────────────────────────────

  @Get('leaderboard')
  @ApiOperation({ summary: 'Community engagement leaderboard' })
  leaderboard() {
    return this.service.getLeaderboard();
  }
}
