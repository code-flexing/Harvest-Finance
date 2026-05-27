import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class YieldAnalyticsDto {
  @ApiProperty({ description: 'Contract ID' })
  contractId: string;

  @ApiProperty({ description: 'Date of the analytics data' })
  date: Date;

  @ApiProperty({ description: 'Total assets in the contract' })
  totalAssets: string;

  @ApiProperty({ description: 'Total shares in the contract' })
  totalShares: string;

  @ApiProperty({ description: 'Number of HardWork events processed' })
  hardworkEventsCount: number;

  @ApiProperty({ description: '7-day rolling APY percentage', nullable: true })
  sevenDayApy: number | null;

  @ApiProperty({ description: 'Daily APY percentage', nullable: true })
  dailyApy: number | null;

  @ApiProperty({ description: 'Price per share' })
  pricePerShare: string;

  @ApiProperty({ description: 'Previous day price per share', nullable: true })
  pricePerSharePrevious: string | null;

  @ApiProperty({ description: '24h volume' })
  volume24h: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class QueryYieldAnalyticsDto {
  @ApiPropertyOptional({ description: 'Filter by contract ID' })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiPropertyOptional({
    description: 'Start date (YYYY-MM-DD)',
    example: '2026-04-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (YYYY-MM-DD)',
    example: '2026-04-30',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Number of days to look back (default: 30)',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number = 30;

  @ApiPropertyOptional({
    description: 'Number of records to skip',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({
    description: 'Max records to return (1-200)',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

export class YieldAnalyticsPageDto {
  @ApiProperty({ type: [YieldAnalyticsDto] })
  items: YieldAnalyticsDto[];

  @ApiProperty({ example: 123 })
  total: number;

  @ApiProperty({ example: 0 })
  skip: number;

  @ApiProperty({ example: 50 })
  limit: number;
}

export class ContractApyDto {
  @ApiProperty({ description: 'Contract ID' })
  contractId: string;

  @ApiProperty({ description: 'Current 7-day APY percentage', nullable: true })
  apy: number | null;
}

export class ProcessHardWorkEventsResponseDto {
  @ApiProperty({ description: 'Whether processing was successful' })
  success: boolean;

  @ApiProperty({ description: 'Number of events processed' })
  eventsProcessed: number;

  @ApiProperty({ description: 'Processing message' })
  message: string;
}
