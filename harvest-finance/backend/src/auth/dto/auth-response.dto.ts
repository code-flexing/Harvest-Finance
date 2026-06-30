import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { UserRole } from '../../database/entities/user.entity';

/** Subset of user fields returned in auth responses. Excludes sensitive data such as password hashes. */
export class UserResponseDto {
  /** Primary key of the user record (UUID v4). */
  @Expose()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID (UUID)',
  })
  id: string;

  /** The user's registered email address. */
  @Expose()
  @ApiProperty({
    example: 'farmer@example.com',
    description: 'User email address',
  })
  email: string;

  /** The platform role that governs the user's permissions and feature access. */
  @Expose()
  @ApiProperty({
    example: 'FARMER',
    enum: UserRole,
    description: 'User role',
  })
  role: UserRole;

  /** The user's display name as provided during registration. */
  @Expose()
  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  full_name: string;

  /** Optional contact phone number. Null when not provided at registration. */
  @Expose()
  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Phone number',
  })
  phone_number?: string | null;

  /** The user's Stellar public key. Null when not linked to an on-chain account. */
  @Expose()
  @ApiPropertyOptional({
    example: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    description: 'Stellar address',
  })
  stellar_address?: string | null;

  /**
   * Indicates how the Stellar wallet is managed.
   * - `none`         – no wallet linked yet.
   * - `self-custody` – user supplied their own wallet address (e.g. Freighter).
   * - `custodial`    – platform-generated and encrypted wallet; user can export the key.
   */
  @Expose()
  @ApiPropertyOptional({
    example: 'custodial',
    enum: ['none', 'self-custody', 'custodial'],
    description: 'Wallet custody type',
  })
  wallet_type?: string | null;
}

/** Response shape returned after a successful login or token refresh. */
export class AuthResponseDto {
  /** Short-lived JWT used to authenticate subsequent API requests. */
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Access token (JWT)',
  })
  access_token: string;

  /** Long-lived JWT used to obtain a new access token without re-login. */
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token (JWT)',
  })
  refresh_token: string;

  /** Profile data for the authenticated user. */
  @ApiProperty({
    type: UserResponseDto,
    description: 'User information',
  })
  user: UserResponseDto;
}

/** Response shape when only a new access token is issued (e.g. after token refresh). */
export class TokenResponseDto {
  /** Freshly issued short-lived JWT access token. */
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description:
      'JWT access token to be sent as a Bearer token in the Authorization header',
  })
  access_token: string;

  /** OAuth 2.0 token type. Always "Bearer" for this API. */
  @ApiProperty({
    example: 'Bearer',
    description:
      'Token type — always "Bearer". Prefix the access_token with this value in the Authorization header.',
  })
  token_type: string;
}

/** Response shape returned after a successful logout. */
export class LogoutResponseDto {
  /** Indicates whether the server successfully invalidated the session/token. */
  @ApiProperty({
    example: true,
    description: 'Logout success status',
  })
  success: boolean;

  /** Human-readable confirmation message. */
  @ApiProperty({
    example: 'Logged out successfully',
    description: 'Logout message',
  })
  message: string;
}

/** Generic success/failure response used for operations that return no data (e.g. forgot-password). */
export class MessageResponseDto {
  /** Whether the requested operation completed without error. */
  @ApiProperty({
    example: true,
    description: 'Success status',
  })
  success: boolean;

  /** Human-readable description of the outcome. */
  @ApiProperty({
    example: 'Password reset link sent to your email',
    description: 'Response message',
  })
  message: string;
}

/** Standard error envelope returned by auth endpoints on failure. */
export class ErrorResponseDto {
  /** HTTP status code mirrored in the body for client convenience. */
  @ApiProperty({
    example: 401,
    description: 'HTTP status code',
  })
  statusCode: number;

  /** Human-readable description of what went wrong. */
  @ApiProperty({
    example: 'Invalid credentials',
    description: 'Error message',
  })
  message: string;

  /** Short error category string matching the HTTP status reason phrase. */
  @ApiProperty({
    example: 'Unauthorized',
    description: 'Error type',
  })
  error: string;
}
