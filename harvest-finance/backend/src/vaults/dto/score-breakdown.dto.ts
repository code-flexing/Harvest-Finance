import { ApiProperty } from '@nestjs/swagger';

export class ScoreBreakdownDto {
  @ApiProperty({
    example: 75,
    description: 'Overall strategy score (0-100)',
  })
  strategyScore: number;

  @ApiProperty({
    example: 80,
    description: 'APY score component (0-100)',
  })
  apyScore: number;

  @ApiProperty({
    example: 70,
    description: 'TVL stability score component (0-100)',
  })
  tvlStabilityScore: number;

  @ApiProperty({
    example: 90,
    description: 'Drawdown score component (0-100)',
  })
  drawdownScore: number;

  @ApiProperty({
    example: 60,
    description: 'Operator reputation score component (0-100)',
  })
  operatorScore: number;
}