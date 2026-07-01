import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// ── Query DTO ────────────────────────────────────────────────────────────────

export class SessionPaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of sessions per page (max 50)',
    example: 10,
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

export class SessionResponseDto {
  @ApiProperty({
    description: 'Session UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Human-readable device / browser name',
    example: 'Chrome on Windows',
    nullable: true,
  })
  deviceName: string | null;

  @ApiPropertyOptional({
    description: 'IP address recorded at login',
    example: '203.0.113.42',
    nullable: true,
  })
  ipAddress: string | null;

  @ApiPropertyOptional({
    description: 'Raw User-Agent string',
    example:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ...',
    nullable: true,
  })
  userAgent: string | null;

  @ApiProperty({
    description: 'ISO 8601 timestamp of the last token refresh on this session',
    example: '2026-06-01T12:00:00.000Z',
  })
  lastUsedAt: Date;

  @ApiProperty({
    description: 'ISO 8601 timestamp when the session was first created',
    example: '2026-05-25T08:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'ISO 8601 hard expiry of the refresh token',
    example: '2026-07-01T08:00:00.000Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'Whether this is the caller\'s own current session',
    example: true,
  })
  isCurrent: boolean;
}

export class SessionListResponseDto {
  @ApiProperty({ type: [SessionResponseDto] })
  items: SessionResponseDto[];

  @ApiProperty({ description: 'Total number of active sessions', example: 3 })
  total: number;

  @ApiProperty({ description: 'Current page', example: 1 })
  page: number;

  @ApiProperty({ description: 'Page size', example: 10 })
  limit: number;
}

export class RevokeSessionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Session revoked successfully' })
  message: string;
}
