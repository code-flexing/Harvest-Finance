import { ApiProperty } from '@nestjs/swagger';

export class VaultRewardSummaryDto {
  @ApiProperty({ example: 'vault-uuid', description: 'Vault ID' })
  vaultId: string;

  @ApiProperty({ example: 'Maize Savings Vault', description: 'Vault name' })
  vaultName: string;

  @ApiProperty({ example: 5000.0, description: 'Total amount deposited in USD' })
  totalDeposited: number;

  @ApiProperty({ example: 250.5, description: 'Total reward earned in USD' })
  totalReward: number;

  @ApiProperty({ example: 5.0, description: 'Annual percentage yield' })
  apy: number;
}

export class UserRewardsResponseDto {
  @ApiProperty({ example: 'user-uuid', description: 'User ID' })
  userId: string;

  @ApiProperty({ example: 350.75, description: 'Aggregate reward across all vaults in USD' })
  totalReward: number;

  @ApiProperty({ type: [VaultRewardSummaryDto], description: 'Per-vault reward breakdown' })
  byVault: VaultRewardSummaryDto[];

  @ApiProperty({ example: '2024-06-01T00:00:00Z', description: 'Timestamp of calculation' })
  calculatedAt: string;
}

export class ClaimRewardsResponseDto {
  @ApiProperty({ example: 'user-uuid', description: 'User ID' })
  userId: string;

  @ApiProperty({ example: 'vault-uuid', nullable: true, description: 'Vault the reward was claimed from; null for all vaults' })
  vaultId: string | null;

  @ApiProperty({ example: 120.0, description: 'Amount claimed in USD' })
  claimedAmount: number;

  @ApiProperty({ example: '2024-06-01T12:00:00Z', description: 'Claim timestamp' })
  claimedAt: string;
}
