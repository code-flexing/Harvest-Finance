import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupCategory } from '../../database/entities/community-group.entity';

export class CreateGroupDto {
  @ApiProperty({ example: 'Maize Growers Network' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: GroupCategory })
  @IsOptional()
  @IsEnum(GroupCategory)
  category?: GroupCategory;

  @ApiPropertyOptional({ example: ['maize', 'grains'] })
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}
