import { IsNumber, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SimulateDepositDto {
  @ApiProperty({
    description: 'Amount to simulate depositing',
    example: 1000,
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  amount: number;
}
