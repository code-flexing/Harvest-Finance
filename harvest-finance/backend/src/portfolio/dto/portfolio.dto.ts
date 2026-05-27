import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class AggregatePortfolioDto {
  @ApiProperty({
    description: 'Stellar public keys (G-addresses) to aggregate balances for',
    example: ['GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWX'],
    type: [String],
    maxItems: 20,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(56, 56, { each: true })
  stellarAddresses: string[];
}

export class AssetBalanceDto {
  @ApiProperty({ example: 'XLM', description: 'Asset code' })
  assetCode: string;

  @ApiPropertyOptional({
    example: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWX',
    description: 'Asset issuer (null for native XLM)',
  })
  assetIssuer: string | null;

  @ApiProperty({
    example: '1234.5670000',
    description: 'Total balance across all accounts',
  })
  balance: string;
}

export class StellarAccountSnapshotDto {
  @ApiProperty({ description: 'Stellar public key' })
  publicKey: string;

  @ApiProperty({
    example: true,
    description: 'Whether the account was found on-chain',
  })
  exists: boolean;

  @ApiProperty({
    type: [AssetBalanceDto],
    description: 'Per-asset balances for this account',
  })
  balances: AssetBalanceDto[];

  @ApiPropertyOptional({
    example: 'Account not found',
    description: 'Present only if an error occurred while loading this account',
  })
  error?: string;
}

export class VaultHoldingDto {
  @ApiProperty({ description: 'Vault ID' })
  vaultId: string;

  @ApiProperty({
    example: 'My Crop Production Vault',
    description: 'Vault name',
  })
  vaultName: string;

  @ApiProperty({ example: 'CROP_PRODUCTION', description: 'Vault type' })
  vaultType: string;

  @ApiProperty({
    example: 1000.5,
    description: 'User balance held in this vault',
  })
  balance: number;
}

export class PortfolioResponseDto {
  @ApiProperty({ description: 'User ID the portfolio belongs to' })
  userId: string;

  @ApiProperty({
    example: '2026-04-24T12:00:00.000Z',
    description: 'ISO timestamp of the aggregation',
  })
  generatedAt: string;

  @ApiProperty({
    type: [StellarAccountSnapshotDto],
    description: 'Per-account breakdown',
  })
  accounts: StellarAccountSnapshotDto[];

  @ApiProperty({
    type: [AssetBalanceDto],
    description: 'Aggregated on-chain balances across all accounts',
  })
  aggregatedStellarBalances: AssetBalanceDto[];

  @ApiProperty({
    type: [VaultHoldingDto],
    description: 'User holdings per vault',
  })
  vaults: VaultHoldingDto[];

  @ApiProperty({
    example: 5000.75,
    description: 'Sum of confirmed deposits across all vaults',
  })
  totalVaultBalance: number;
}
