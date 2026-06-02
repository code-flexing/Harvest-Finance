import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BatchDepositItemDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Vault ID (UUID)',
  })
  @IsString()
  @IsNotEmpty()
  vaultId: string;

  @ApiProperty({
    example: 100.5,
    description: 'Deposit amount (must be greater than 0)',
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 8 }, { message: 'Amount must be a number' })
  @Min(0.01, { message: 'Deposit amount must be greater than 0' })
  @Max(1000000, { message: 'Deposit amount cannot exceed 1,000,000' })
  @IsNotEmpty({ message: 'Amount is required' })
  amount: number;

  @ApiProperty({
    example: 'batch_item_key_1',
    description: 'Unique key to prevent duplicate deposits per user (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  idempotencyKey?: string;
}

export class BatchDepositDto {
  @ApiProperty({ type: [BatchDepositItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BatchDepositItemDto)
  deposits: BatchDepositItemDto[];
}

