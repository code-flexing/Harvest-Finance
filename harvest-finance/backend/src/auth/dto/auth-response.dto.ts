import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../database/entities/user.entity';

export class UserResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID (UUID)',
  })
  id: string;

  @ApiProperty({
    example: 'farmer@example.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({
    example: 'FARMER',
    enum: UserRole,
    description: 'User role',
  })
  role: UserRole;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  full_name: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Phone number',
  })
  phone_number?: string | null;

  @ApiPropertyOptional({
    example: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    description: 'Stellar address',
  })
  stellar_address?: string | null;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Access token (JWT)',
  })
  access_token: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token (JWT)',
  })
  refresh_token: string;

  @ApiProperty({
    type: UserResponseDto,
    description: 'User information',
  })
  user: UserResponseDto;
}

export class TokenResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Access token (JWT)',
  })
  access_token: string;
}

export class LogoutResponseDto {
  @ApiProperty({
    example: true,
    description: 'Logout success status',
  })
  success: boolean;

  @ApiProperty({
    example: 'Logged out successfully',
    description: 'Logout message',
  })
  message: string;
}

export class MessageResponseDto {
  @ApiProperty({
    example: true,
    description: 'Success status',
  })
  success: boolean;

  @ApiProperty({
    example: 'Password reset link sent to your email',
    description: 'Response message',
  })
  message: string;
}

export class ErrorResponseDto {
  @ApiProperty({
    example: 'Unauthorized',
    description: 'Error status',
  })
  statusCode: number;

  @ApiProperty({
    example: 'Invalid credentials',
    description: 'Error message',
  })
  message: string;

  @ApiProperty({
    example: 'Unauthorized',
    description: 'Error error',
  })
  error: string;
}
