import { ApiProperty } from '@nestjs/swagger';
import { DepositEventType } from '../../database/entities/deposit-event.entity';

export class DepositEventResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  depositId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  userId: string;

  @ApiProperty({ example: '456e7890-e89b-12d3-a456-426614174111' })
  vaultId: string;

  @ApiProperty({ enum: DepositEventType, example: DepositEventType.CONFIRMED })
  eventType: DepositEventType;

  @ApiProperty({ example: 1000.5 })
  amount: number;

  @ApiProperty({ required: false, nullable: true })
  payload: Record<string, unknown> | null;

  @ApiProperty({ required: false, nullable: true })
  transactionHash: string | null;

  @ApiProperty({ required: false, nullable: true })
  stellarTransactionId: string | null;

  @ApiProperty({ required: false, nullable: true })
  idempotencyKey: string | null;

  @ApiProperty({ example: '2023-01-01T00:05:00Z' })
  occurredAt: Date;
}
