import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({ example: 256 })
  totalUsers: number;

  @ApiProperty({ example: 156 })
  activeUsers: number;

  @ApiProperty({ example: 1250000.5 })
  totalDeposits: number;

  @ApiProperty({ example: 45000.75 })
  totalRewardsDistributed: number;

  @ApiProperty({ example: 12 })
  activeVaults: number;

  @ApiProperty({ example: 8.5 })
  averageApy: number;
}
