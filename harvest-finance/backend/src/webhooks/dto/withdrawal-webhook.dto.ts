import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ExternalPaymentEventType } from '../../vaults/dto/external-payment-notification.dto';

export { ExternalPaymentEventType as WithdrawalWebhookEventType };

export class WithdrawalWebhookDto {
  @ApiProperty({ description: 'Unique webhook event identifier' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({ enum: ExternalPaymentEventType })
  @IsEnum(ExternalPaymentEventType)
  eventType: ExternalPaymentEventType;

  @ApiProperty({ description: 'Internal withdrawal ID' })
  @IsString()
  @IsNotEmpty()
  withdrawalId: string;

  @ApiProperty({ description: 'Transaction hash on Stellar (if confirmed/failed on-chain)' })
  @IsString()
  @IsNotEmpty()
  transactionHash: string;

  @ApiPropertyOptional({ description: 'Stellar transaction ID if different from hash' })
  @IsOptional()
  @IsString()
  stellarTransactionId?: string;

  @ApiPropertyOptional({ description: 'ISO-8601 timestamp of when the event occurred' })
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}
