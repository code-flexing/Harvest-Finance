import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class StellarHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Number of records to skip from the start of the result set',
    example: 0,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({
    description: 'Maximum number of records to return (capped at 200)',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Ordering by ledger sequence',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}

export class StellarTransactionRecordDto {
  @ApiProperty({ example: 'fe...abc', description: 'Transaction hash' })
  hash: string;

  @ApiProperty({
    example: 1234567,
    description: 'Ledger sequence the tx closed in',
  })
  ledger: number;

  @ApiProperty({
    example: '2026-04-24T12:00:00Z',
    description: 'Ledger close time',
  })
  createdAt: string;

  @ApiProperty({ example: 'GA...XYZ', description: 'Source account' })
  sourceAccount: string;

  @ApiProperty({ example: '100', description: 'Fee charged in stroops' })
  feeCharged: string;

  @ApiProperty({ example: 1, description: 'Number of operations in the tx' })
  operationCount: number;

  @ApiProperty({
    example: true,
    description: 'Whether the transaction succeeded',
  })
  successful: boolean;

  @ApiProperty({
    example: 'HF-escrow:123',
    nullable: true,
    description: 'Memo value if any',
  })
  memo: string | null;

  @ApiProperty({
    example: 'text',
    nullable: true,
    description: 'Memo type if any',
  })
  memoType: string | null;

  @ApiProperty({ example: '1234567-1', description: 'Horizon paging token' })
  pagingToken: string;
}

export class StellarHistoryPageDto {
  @ApiProperty({ type: [StellarTransactionRecordDto] })
  records: StellarTransactionRecordDto[];

  @ApiProperty({ example: 0, description: 'Records skipped' })
  skip: number;

  @ApiProperty({ example: 20, description: 'Page size used' })
  limit: number;

  @ApiProperty({ enum: ['asc', 'desc'], example: 'desc' })
  order: 'asc' | 'desc';

  @ApiProperty({
    example: null,
    nullable: true,
    description:
      'Horizon cursor for the first record in the page (for cursor-based clients)',
  })
  prevCursor: string | null;

  @ApiProperty({
    example: null,
    nullable: true,
    description:
      'Horizon cursor for the last record in the page (for cursor-based clients)',
  })
  nextCursor: string | null;

  @ApiProperty({
    example: null,
    nullable: true,
    description:
      'Total record count; Horizon does not provide totals so this is always null',
  })
  total: number | null;
}

export class DecodedOperationDto {
  @ApiProperty({ example: 'payment', description: 'Operation type' })
  type: string;

  @ApiProperty({
    example: { amount: '100', destination: 'GA...' },
    description: 'Operation details',
  })
  details: Record<string, any>;
}

export class DecodedTransactionDto {
  @ApiProperty({ example: 'fe...abc', description: 'Transaction hash' })
  hash: string;

  @ApiProperty({ example: 1234567, description: 'Ledger sequence' })
  ledger: number;

  @ApiProperty({ example: '2026-04-24T12:00:00Z' })
  createdAt: string;

  @ApiProperty({ example: 'GA...XYZ' })
  sourceAccount: string;

  @ApiProperty({ example: true })
  successful: boolean;

  @ApiProperty({ example: 'memo', nullable: true })
  memo: string | null;

  @ApiProperty({ type: [DecodedOperationDto] })
  operations: DecodedOperationDto[];
}

export class DecodedHistoryPageDto {
  @ApiProperty({ type: [DecodedTransactionDto] })
  records: DecodedTransactionDto[];

  @ApiProperty({ example: 0 })
  skip: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ enum: ['asc', 'desc'], example: 'desc' })
  order: 'asc' | 'desc';
}
