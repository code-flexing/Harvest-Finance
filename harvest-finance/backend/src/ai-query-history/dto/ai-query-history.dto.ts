import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateAiQueryHistoryDto {
  @ApiProperty({ example: 'What is the best crop for this season?', description: 'The AI query text' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({ example: 'Based on your region, maize is recommended...', description: 'The AI response text' })
  @IsString()
  @IsNotEmpty()
  response: string;

  @ApiPropertyOptional({ example: { vaultId: 'uuid', balance: 1000 }, description: 'Optional vault context at query time' })
  @IsOptional()
  @IsObject()
  vaultContext?: Record<string, any>;

  @ApiPropertyOptional({ example: { season: 'WET', rainfall: 120 }, description: 'Optional seasonal data at query time' })
  @IsOptional()
  @IsObject()
  seasonalData?: Record<string, any>;
}

export class AiQueryHistoryResponseDto {
  @ApiProperty({ example: 'uuid-123', description: 'Query history record ID' })
  id: string;

  @ApiProperty({ example: 'What is the best crop for this season?', description: 'The AI query text' })
  query: string;

  @ApiProperty({ example: 'Based on your region, maize is recommended...', description: 'The AI response text' })
  response: string;

  @ApiPropertyOptional({ example: { vaultId: 'uuid', balance: 1000 }, nullable: true, description: 'Vault context snapshot' })
  vaultContext: Record<string, any> | null;

  @ApiPropertyOptional({ example: { season: 'WET' }, nullable: true, description: 'Seasonal data snapshot' })
  seasonalData: Record<string, any> | null;

  @ApiProperty({ example: '2024-06-01T10:00:00Z', description: 'Timestamp when the query was recorded' })
  createdAt: Date;
}
