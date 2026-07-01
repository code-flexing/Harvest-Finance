import { ApiProperty } from '@nestjs/swagger';

export class SimulationResultDto {
  @ApiProperty({
    description: 'Vault ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  vaultId: string;

  @ApiProperty({
    description: 'Expected net amount after fees',
    example: 995,
    type: Number,
    required: false,
  })
  expectedNetAmount?: number;

  @ApiProperty({
    description: 'Fees to be deducted',
    example: 5,
    type: Number,
    required: false,
  })
  feesDeducted?: number;

  @ApiProperty({
    description: 'Projected APY',
    example: 12.5,
    type: Number,
    required: false,
  })
  projectedAPY?: number;

  @ApiProperty({
    description: 'Lock expiry date',
    type: Date,
    required: false,
  })
  lockExpiry?: Date;

  @ApiProperty({
    description: 'Deposit amount',
    example: 1000,
    type: Number,
    required: false,
  })
  depositAmount?: number;

  @ApiProperty({
    description: 'Current APY',
    example: 10.5,
    type: Number,
    required: false,
  })
  currentAPY?: number;

  @ApiProperty({
    description: 'New APY after strategy change',
    example: 12.5,
    type: Number,
    required: false,
  })
  newAPY?: number;

  @ApiProperty({
    description: 'APY impact (newAPY - currentAPY)',
    example: 2,
    type: Number,
    required: false,
  })
  apyImpact?: number;

  @ApiProperty({
    description: 'Cost of rebalancing strategy',
    example: 1.5,
    type: Number,
    required: false,
  })
  rebalancingCost?: number;

  @ApiProperty({
    description: 'Timestamp when simulation was created',
    type: Date,
  })
  simulatedAt: Date;
}
