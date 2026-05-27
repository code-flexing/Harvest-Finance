import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Password validation regex pattern.
 * Requires at least one uppercase, one lowercase, one digit,
 * and one special character (@$!%*?&).
 */
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

/** Request body for completing a password reset using a reset token. */
export class ResetPasswordDto {
  /**
   * The short-lived reset token delivered to the user's email by the
   * forgot-password flow. Invalidated after a single use or expiry.
   */
  @ApiProperty({
    example: 'abc123def456...',
    description: 'Reset token sent to user email',
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  /**
   * The user's desired new password.
   * Must satisfy the same complexity rules as registration (8–32 chars,
   * upper/lower/digit/special). Replaces the existing bcrypt hash on success.
   */
  @ApiProperty({
    example: 'NewSecurePass123!',
    description:
      'New password must contain at least 8 characters, uppercase, lowercase, number, and special character',
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(32, { message: 'Password must not exceed 32 characters' })
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  @IsNotEmpty({ message: 'Password is required' })
  new_password: string;
}
