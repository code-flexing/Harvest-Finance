import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for vault data exposed via the API.
 * Includes TVL watermark fields for social proof metrics.
 */
export class VaultResponseDto {
  @ApiProperty({ description: 'Unique vault identifier' })
  id: string;

  @ApiProperty({ description: 'Vault display name' })
  name: string;

  @ApiProperty({ description: 'On-chain token address for the vault asset' })
  tokenAddress: string;

  @ApiProperty({ description: 'ID of the vault owner' })
  ownerId: string;

  @ApiProperty({
    description: 'Current total value locked in the vault (decimal string)',
    example: '1000000.00',
  })
  totalAssets: string;

  @ApiProperty({
    description: 'All-time high TVL watermark (decimal string). Monotonically increasing.',
    example: '2500000.00',
  })
  tvlAtHighWatermark: string;

  @ApiPropertyOptional({
    description: 'Timestamp when the all-time high TVL watermark was achieved',
    example: '2024-01-15T10:30:00.000Z',
  })
  watermarkAchievedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

/**
 * Response DTO for the TVL leaderboard endpoint.
 * Ranks vaults by their all-time high TVL watermark descending.
 */
export class VaultLeaderboardEntryDto {
  @ApiProperty({ description: 'Leaderboard rank (1-indexed)' })
  rank: number;

  @ApiProperty({ description: 'Unique vault identifier' })
  id: string;

  @ApiProperty({ description: 'Vault display name' })
  name: string;

  @ApiProperty({
    description: 'All-time high TVL watermark (decimal string)',
    example: '2500000.00',
  })
  tvlAtHighWatermark: string;

  @ApiPropertyOptional({
    description: 'Timestamp when the all-time high TVL watermark was achieved',
  })
  watermarkAchievedAt: Date | null;

  @ApiProperty({
    description: 'Current total value locked in the vault (decimal string)',
  })
  totalAssets: string;
}
