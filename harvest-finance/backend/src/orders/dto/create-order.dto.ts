import { IsString, IsNumber, Min, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const SUPPORTED_CROPS = ['WHEAT', 'MAIZE', 'RICE', 'SOY'];

export class CreateOrderDto {
  @ApiProperty({ example: 'WHEAT', enum: SUPPORTED_CROPS })
  @IsString()
  @IsIn(SUPPORTED_CROPS)
  cropType: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 12.5 })
  @IsNumber()
  @Min(0.0000001)
  price: number;

  @ApiPropertyOptional({
    example: 'XLM',
    description: 'Asset code for payment, defaults to XLM',
  })
  @IsOptional()
  @IsString()
  assetCode?: string;
}
