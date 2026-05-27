import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Request body for exchanging a refresh token for a new access token. */
export class RefreshTokenDto {
  /**
   * The long-lived JWT refresh token issued at login or token refresh.
   * Used to obtain a new access token without re-authentication.
   * Invalidated on use (rotation) or when the user logs out.
   */
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token',
  })
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refresh_token: string;
}
