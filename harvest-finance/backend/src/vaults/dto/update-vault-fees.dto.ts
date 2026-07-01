import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateVaultFeesDto {
  @ApiProperty({ example: 50, description: 'Entry fee in basis points (50 bps = 0.5%)' })
  @IsInt()
  @Min(0)
  entryFeeBps: number;

  @ApiProperty({ example: 50, description: 'Exit fee in basis points (50 bps = 0.5%)' })
  @IsInt()
  @Min(0)
  exitFeeBps: number;

  @ApiProperty({ example: 1000, description: 'Performance fee in basis points (1000 bps = 10%)' })
  @IsInt()
  @Min(0)
  performanceFeeBps: number;

  @ApiProperty({
    example: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    description: 'Wallet address where fees are transferred',
    required: false,
  })
  @IsOptional()
  @IsString()
  feeAddress?: string;
}
