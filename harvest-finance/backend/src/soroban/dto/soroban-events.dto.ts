import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { SorobanEventType } from '../../database/entities/soroban-event.entity';

export class QuerySorobanEventsDto {
  @ApiPropertyOptional({
    description: 'Filter by contract ID (C-address)',
    example: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  contractId?: string;

  @ApiPropertyOptional({
    enum: SorobanEventType,
    description: 'Filter by event type',
  })
  @IsOptional()
  @IsEnum(SorobanEventType)
  type?: SorobanEventType;

  @ApiPropertyOptional({
    description: 'Minimum ledger sequence (inclusive)',
    example: 100000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fromLedger?: number;

  @ApiPropertyOptional({
    description: 'Maximum ledger sequence (inclusive)',
    example: 200000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  toLedger?: number;

  @ApiPropertyOptional({
    description: 'Number of records to skip',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({
    description: 'Max records to return (1-100)',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class SorobanEventDto {
  @ApiProperty() id: string;
  @ApiProperty() eventId: string;
  @ApiProperty({ enum: SorobanEventType }) type: SorobanEventType;
  @ApiProperty({ nullable: true }) contractId: string | null;
  @ApiProperty() ledger: number;
  @ApiProperty() ledgerClosedAt: Date;
  @ApiProperty({ nullable: true }) transactionHash: string | null;
  @ApiProperty() pagingToken: string;
  @ApiProperty({ type: [String] }) topics: string[];
  @ApiProperty({ required: false, nullable: true }) value: unknown;
  @ApiProperty() inSuccessfulContractCall: boolean;
  @ApiProperty() indexedAt: Date;
}

export class SorobanEventPageDto {
  @ApiProperty({ type: [SorobanEventDto] })
  items: SorobanEventDto[];

  @ApiProperty({ example: 123 })
  total: number;

  @ApiProperty({ example: 0 })
  skip: number;

  @ApiProperty({ example: 50 })
  limit: number;
}

export class IndexerStatusDto {
  @ApiProperty({ example: true, description: 'Whether the indexer is enabled' })
  enabled: boolean;

  @ApiProperty({
    example: 'https://soroban-testnet.stellar.org',
    description: 'Soroban RPC URL',
  })
  rpcUrl: string;

  @ApiProperty({
    example: 123456,
    nullable: true,
    description: 'Last ledger sequence indexed',
  })
  lastLedger: number | null;

  @ApiProperty({
    example: 123456,
    nullable: true,
    description: 'Total events indexed',
  })
  totalEvents: number;

  @ApiProperty({
    example: '2026-04-24T12:00:00.000Z',
    nullable: true,
    description: 'Last successful poll timestamp',
  })
  lastPolledAt: string | null;
}
