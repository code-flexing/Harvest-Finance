import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ExternalPaymentEventType } from '../../vaults/dto/external-payment-notification.dto';

export { ExternalPaymentEventType as PaymentWebhookEventType };

export class PaymentWebhookDto {
  @ApiProperty({ description: 'Unique idempotency key from the payment provider' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({ enum: ExternalPaymentEventType })
  @IsEnum(ExternalPaymentEventType)
  eventType: ExternalPaymentEventType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  depositId: string;

  @ApiProperty({ description: 'On-chain or provider transaction hash' })
  @IsString()
  @IsNotEmpty()
  transactionHash: string;

  @ApiPropertyOptional({ description: 'Stellar network transaction identifier' })
  @IsOptional()
  @IsString()
  stellarTransactionId?: string;

  @ApiPropertyOptional({ description: 'ISO-8601 timestamp from the provider' })
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}
