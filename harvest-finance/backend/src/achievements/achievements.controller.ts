import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AchievementsService } from './achievements.service';
import { AchievementResponseDto } from './dto/achievement-response.dto';

@ApiTags('Achievements')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users/:userId/achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user achievements', description: 'Returns all achievements unlocked by the specified user.' })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)', example: 'user-uuid' })
  @ApiResponse({ status: 200, description: 'Achievements retrieved successfully', type: [AchievementResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAchievements(@Param('userId') userId: string) {
    return this.achievementsService.getUserAchievements(userId);
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate and unlock achievements', description: 'Runs the achievement evaluation logic for the user and unlocks any newly earned achievements.' })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)', example: 'user-uuid' })
  @ApiResponse({ status: 201, description: 'Evaluation complete; newly unlocked achievements returned', type: [AchievementResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  evaluateAchievements(@Param('userId') userId: string) {
    return this.achievementsService.evaluateAndUnlock(userId);
  }
}
