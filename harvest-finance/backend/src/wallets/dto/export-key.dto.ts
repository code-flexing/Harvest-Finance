import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Request body for the export-private-key endpoint.
 * The user must supply their current plaintext password to prove identity
 * before the encrypted secret key is decrypted and returned.
 */
export class ExportKeyDto {
  /**
   * The user's current plaintext password.
   * Used to re-derive the AES encryption key via Argon2id and decrypt the stored secret.
   */
  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Current account password — used to decrypt the custodial private key.',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}
