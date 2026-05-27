import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Request body for the standard email/password login endpoint. */
export class LoginDto {
  /**
   * The registered email address of the user.
   * Must be a valid RFC-5321 email format.
   */
  @ApiProperty({
    example: 'farmer@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  /**
   * The user's plaintext password.
   * Compared against the stored bcrypt hash on the server — never stored as-is.
   */
  @ApiProperty({
    example: 'SecurePass123!',
    description: 'User password',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
