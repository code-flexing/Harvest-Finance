import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ example: 'GBXXX...', description: 'Wallet address of the intended depositor' })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({ example: 5000, description: 'Amount reserved for this depositor' })
  @IsNumber()
  @Min(0.00000001)
  reservedAmount: number;

  @ApiProperty({ example: '2026-07-01T00:00:00Z', description: 'Reservation expiry timestamp (ISO 8601)' })
  @IsDateString()
  expiresAt: string;
}
