import { ApiProperty } from '@nestjs/swagger';

export class ReservationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  vaultId: string;

  @ApiProperty()
  walletAddress: string;

  @ApiProperty()
  reservedAmount: number;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}
