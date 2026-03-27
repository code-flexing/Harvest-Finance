import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AchievementsService } from './achievements.service';

@Controller('users/:userId/achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  getAchievements(@Param('userId') userId: string) {
    return this.achievementsService.getUserAchievements(userId);
  }

  @Post('evaluate')
  evaluateAchievements(@Param('userId') userId: string) {
    return this.achievementsService.evaluateAndUnlock(userId);
  }
}
