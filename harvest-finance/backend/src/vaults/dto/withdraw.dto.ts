import { IsNumber, IsPositive, IsUUID, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WithdrawDto {
  @ApiProperty({
    description: 'The ID of the user requesting the withdrawal',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'The amount to withdraw from the vault',
    example: 100.5,
  })
  @IsNumber()
  @IsPositive()
  amount: number;
}
