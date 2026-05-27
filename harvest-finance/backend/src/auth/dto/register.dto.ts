import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../database/entities/user.entity';

/**
 * Password validation regex pattern.
 * Requires: at least one uppercase letter, one lowercase letter,
 * one number, and one special character (@$!%*?&).
 * Minimum 8 characters enforced separately via @MinLength.
 */
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

/** Request body for new user registration. */
export class RegisterDto {
  /**
   * The user's email address. Must be unique across all accounts.
   * Used as the primary login identifier.
   */
  @ApiProperty({
    example: 'farmer@example.com',
    description: 'User email address (must be unique)',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  /**
   * Plaintext password chosen by the user.
   * Must be 8–32 characters and satisfy PASSWORD_REGEX complexity rules.
   * Stored as a bcrypt hash — never persisted in plaintext.
   */
  @ApiProperty({
    example: 'SecurePass123!',
    description:
      'Password must contain at least 8 characters, uppercase, lowercase, number, and special character',
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(32, { message: 'Password must not exceed 32 characters' })
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  /**
   * The platform role assigned to the new account.
   * Determines which features and resources the user can access.
   * Must be one of: FARMER, BUYER, INSPECTOR, ADMIN.
   */
  @ApiProperty({
    example: 'FARMER',
    enum: UserRole,
    description: 'User role: FARMER, BUYER, INSPECTOR, or ADMIN',
  })
  @IsEnum(UserRole, {
    message: 'Role must be FARMER, BUYER, INSPECTOR, or ADMIN',
  })
  @IsNotEmpty({ message: 'Role is required' })
  role: UserRole;

  /**
   * The user's display name shown across the platform.
   * Must be 2–100 characters.
   */
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  @IsString({ message: 'Full name must be a string' })
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
  @IsNotEmpty({ message: 'Full name is required' })
  full_name: string;

  /**
   * Optional contact phone number including country code (e.g. +1234567890).
   * Max 20 characters to accommodate all international formats.
   */
  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Phone number with country code',
  })
  @IsString({ message: 'Phone number must be a string' })
  @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
  phone_number?: string;

  /**
   * The user's Stellar blockchain public key (56-character G... address).
   * Used to link the account to on-chain operations such as vault deposits.
   */
  @ApiProperty({
    example: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    description: 'Stellar blockchain address',
  })
  @IsString({ message: 'Stellar address must be a string' })
  @MaxLength(56, { message: 'Stellar address must not exceed 56 characters' })
  @IsNotEmpty({ message: 'Stellar address is required' })
  stellar_address: string;
}
