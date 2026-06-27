import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RewardsService } from './rewards.service';
import { UserRewardsResponseDto, ClaimRewardsResponseDto } from './dto/reward-response.dto';

@ApiTags('Rewards')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users/:userId/rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user rewards', description: 'Returns the total reward balance and per-vault breakdown for the specified user.' })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)', example: 'user-uuid' })
  @ApiResponse({ status: 200, description: 'Rewards retrieved successfully', type: UserRewardsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserRewards(@Param('userId') userId: string) {
    return this.rewardsService.getUserRewards(userId);
  }

  @Post('claim')
  @ApiOperation({ summary: 'Claim rewards', description: 'Claims accumulated rewards for the user, optionally scoped to a single vault.' })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)', example: 'user-uuid' })
  @ApiQuery({ name: 'vaultId', required: false, description: 'Limit claim to a specific vault ID' })
  @ApiResponse({ status: 201, description: 'Rewards claimed successfully', type: ClaimRewardsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  claimRewards(
    @Param('userId') userId: string,
    @Query('vaultId') vaultId?: string,
  ) {
    return this.rewardsService.claimRewards(userId, vaultId);
  }
}
