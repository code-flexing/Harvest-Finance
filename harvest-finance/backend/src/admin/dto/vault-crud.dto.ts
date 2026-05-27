import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { VaultType, VaultStatus } from '../../database/entities/vault.entity';

export class CreateVaultDto {
  @ApiProperty({ example: 'Corn High Yield Vault' })
  @IsString()
  vaultName: string;

  @ApiProperty({ example: 'A secure vault for high yield corn staking.' })
  @IsString()
  description: string;

  @ApiProperty({ enum: VaultType, example: VaultType.CROP_PRODUCTION })
  @IsEnum(VaultType)
  type: VaultType;

  @ApiProperty({ example: 15.5 })
  @IsNumber()
  interestRate: number;

  @ApiProperty({ example: 1000000 })
  @IsNumber()
  maxCapacity: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  maturityDate?: Date;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  lockPeriodEnd?: Date;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class UpdateVaultDto extends CreateVaultDto {
  @ApiPropertyOptional({ enum: VaultStatus, example: VaultStatus.ACTIVE })
  @IsOptional()
  @IsEnum(VaultStatus)
  status?: VaultStatus;
}
