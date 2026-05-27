import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Request body for initiating a password reset flow. */
export class ForgotPasswordDto {
  /**
   * The email address associated with the account.
   * A reset link is sent to this address if an account is found.
   * No error is thrown when the email is not registered (prevents user enumeration).
   */
  @ApiProperty({
    example: 'farmer@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}
