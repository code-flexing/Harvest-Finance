import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SorobanEventType } from '../../database/entities/soroban-event.entity';

export class ChainEventWebhookDto {
  @ApiProperty({ description: 'Unique event identifier from the chain indexer' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({ enum: SorobanEventType })
  @IsEnum(SorobanEventType)
  type: SorobanEventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  ledger: number;

  @ApiProperty({ description: 'ISO-8601 ledger close time' })
  @IsISO8601()
  ledgerClosedAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionHash?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  pagingToken: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  value?: unknown;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  inSuccessfulContractCall?: boolean;
}
