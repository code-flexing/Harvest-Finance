import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostType } from '../../database/entities/community-post.entity';

export class CreatePostDto {
  @ApiProperty({ example: 'Best practices for maize irrigation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example:
      'I have been using drip irrigation and it cut my water usage by 40%...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({ enum: PostType })
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @ApiPropertyOptional({ example: 'group-uuid' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ example: ['irrigation', 'maize'] })
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
