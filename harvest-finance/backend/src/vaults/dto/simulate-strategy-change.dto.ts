import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SimulateStrategyChangeDto {
  @ApiProperty({
    description: 'New APY for the strategy',
    example: 12.5,
    type: Number,
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  newAPY?: number;
}
