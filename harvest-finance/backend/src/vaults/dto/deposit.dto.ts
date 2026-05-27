import {
  IsString,
  IsNumber,
  IsNotEmpty,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID making the deposit',
  })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  @IsNotEmpty({ message: 'User ID is required' })
  userId: string;

  @ApiProperty({
    example: 1000.5,
    description: 'Deposit amount (must be greater than 0)',
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 8 }, { message: 'Amount must be a number' })
  @Min(0.01, { message: 'Deposit amount must be greater than 0' })
  @Max(1000000, { message: 'Deposit amount cannot exceed 1,000,000' })
  @IsNotEmpty({ message: 'Amount is required' })
  amount: number;
  @ApiProperty({
    example: 'tx_123456789',
    description: 'Unique key to prevent duplicate deposits (optional)',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  idempotencyKey?: string;
}
