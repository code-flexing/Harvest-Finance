import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTOs for the SEP-10 Stellar Web Authentication flow.
 *
 * Flow overview:
 *   1. Client sends its public key → server returns a challenge transaction (XDR).
 *   2. Client signs the challenge with its Stellar secret key.
 *   3. Client submits the signed XDR → server verifies and returns JWT tokens.
 */

/** Request body for step 1 — asking the server for a challenge transaction. */
export class StellarChallengeDto {
  /**
   * The client's Stellar public key (56-character G... address).
   * The server embeds this key into the challenge transaction so the
   * client must sign with the corresponding secret key to prove ownership.
   */
  @ApiProperty({
    description: 'Stellar public key of the client requesting authentication',
    example: 'GC5X3FML4S25HDAMJYZJYAC3CKLDWV2Z6YPV3IZXOSHSQKNSKUNQFXQN',
  })
  @IsString()
  @IsNotEmpty()
  public_key: string;
}

/** Server response for step 1 — the unsigned challenge transaction the client must sign. */
export class StellarChallengeResponseDto {
  /**
   * The server's Stellar public key.
   * Clients should verify the challenge transaction is signed by this key
   * before signing it themselves, to prevent man-in-the-middle attacks.
   */
  @ApiProperty({
    description: 'Server Stellar public key for client verification',
    example: 'GCWHSK5KNLKB77NAEA3CKDKLY5GTMNKHXQRPUF6STZOD3J6VYVVZNBRV',
  })
  @IsString()
  server_public_key: string;

  /**
   * The SEP-10 challenge transaction encoded as base64 XDR.
   * The client must sign this with its secret key and return it in StellarVerifyDto.
   */
  @ApiProperty({
    description: 'Challenge transaction XDR (base64 encoded)',
    example: 'AAAAAK7clQAAAA...',
  })
  @IsString()
  @IsNotEmpty()
  transaction: string;

  /**
   * The Stellar network passphrase used when signing the transaction.
   * Must match the network the server operates on (mainnet or testnet).
   */
  @ApiProperty({
    description: 'Network passphrase',
    example: 'Test SDF Network ; September 2015',
  })
  @IsString()
  network_passphrase: string;
}

/** Request body for step 2 — submitting the client-signed challenge transaction. */
export class StellarVerifyDto {
  /**
   * The challenge transaction from StellarChallengeResponseDto, now signed
   * by the client's Stellar secret key, encoded as base64 XDR.
   * The server verifies the signature to confirm key ownership.
   */
  @ApiProperty({
    description: 'Signed challenge transaction XDR (base64 encoded)',
    example: 'AAAAAK7clQAAAA...',
  })
  @IsString()
  @IsNotEmpty()
  transaction: string;
}

/** Response returned after successful Stellar authentication (step 2). */
export class StellarAuthResponseDto {
  /** Short-lived JWT access token for authenticating subsequent API requests. */
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  access_token: string;

  /** Long-lived JWT refresh token used to obtain new access tokens without re-authentication. */
  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  refresh_token: string;

  /**
   * Basic profile of the authenticated user.
   * Contains only the fields needed to identify the account on the client side.
   */
  @ApiProperty({
    description: 'User information',
    example: {
      id: 'uuid-string',
      stellar_address:
        'GC5X3FML4S25HDAMJYZJYAC3CKLDWV2Z6YPV3IZXOSHSQKNSKUNQFXQN',
      role: 'FARMER',
      full_name: 'Stellar User',
    },
  })
  user: {
    id: string;
    stellar_address: string;
    role: string;
    full_name: string;
  };
}
