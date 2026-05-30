import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  Min,
  Length,
} from 'class-validator';

export class CreateEscrowDto {
  @ApiProperty({
    example: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWX',
  })
  @IsString()
  @IsNotEmpty()
  @Length(56, 56)
  farmerPublicKey: string;

  @ApiProperty({
    example: 'GBUYER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGH',
  })
  @IsString()
  @IsNotEmpty()
  @Length(56, 56)
  buyerPublicKey: string;

  @ApiProperty({
    example: '1000.0000000',
    description: 'Amount as a numeric string',
  })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiPropertyOptional({
    example: 'USDC',
    description: 'Asset code, defaults to XLM',
  })
  @IsString()
  @IsOptional()
  assetCode?: string;

  @ApiPropertyOptional({
    description: 'Asset issuer, required for non-native assets',
  })
  @IsString()
  @IsOptional()
  assetIssuer?: string;

  @ApiProperty({
    example: 1746057600,
    description: 'Unix timestamp (seconds) for escrow expiry',
  })
  @IsNumber()
  @Min(0)
  deadlineUnixTimestamp: number;

  @ApiProperty({
    example: 'order-123',
    description: 'Internal order ID referenced by the memo',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;
}

export class ReleasePaymentDto {
  @ApiProperty({ description: 'Claimable balance ID returned by createEscrow' })
  @IsString()
  @IsNotEmpty()
  balanceId: string;

  @ApiProperty({
    example: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWX',
  })
  @IsString()
  @IsNotEmpty()
  @Length(56, 56)
  farmerPublicKey: string;

  @ApiProperty({ description: 'Farmer secret key (S-address)' })
  @IsString()
  @IsNotEmpty()
  farmerSecretKey: string;
}

export class RefundDto {
  @ApiProperty({ description: 'Claimable balance ID to refund' })
  @IsString()
  @IsNotEmpty()
  balanceId: string;

  @ApiProperty({
    example: 'GBUYER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGH',
  })
  @IsString()
  @IsNotEmpty()
  @Length(56, 56)
  buyerPublicKey: string;

  @ApiProperty({ description: 'Buyer secret key (S-address)' })
  @IsString()
  @IsNotEmpty()
  buyerSecretKey: string;
}

export class SetupMultiSigDto {
  @ApiProperty({ description: 'Primary account public key' })
  @IsString()
  @IsNotEmpty()
  @Length(56, 56)
  primaryPublicKey: string;

  @ApiProperty({ type: [String], description: 'Cosigner public keys' })
  cosignerPublicKeys: string[];

  @ApiProperty({ example: 2, description: 'Signing threshold (1..N)' })
  @IsNumber()
  @Min(1)
  threshold: number;

  @ApiProperty({ description: 'Secret key of the account being configured' })
  @IsString()
  @IsNotEmpty()
  sourceSecretKey: string;
}

export class OperationRecordDto {
  @ApiProperty({
    example: 'payment',
    description:
      'The type of operation (e.g. payment, create_claimable_balance, etc.)',
  })
  @IsString()
  type: string;

  @ApiPropertyOptional({
    example: 'GBUYER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGH',
    description: 'Source account of the operation',
  })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    example: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWX',
    description: 'Destination account of the operation',
  })
  @IsString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({
    example: '100.0000000',
    description: 'Amount transferred in the operation',
  })
  @IsString()
  @IsOptional()
  amount?: string;

  @ApiPropertyOptional({
    example: 'USDC:GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWX',
    description: 'Asset identifier (e.g. XLM or CODE:ISSUER)',
  })
  @IsString()
  @IsOptional()
  asset?: string;
}

export class StellarTransactionStatusDto {
  @ApiProperty({
    example: '4c1143892809f6e622b07541604a8b75c3dbb9fa64dfbc8813a30eb6a58a74e5',
    description: 'Hex-encoded Stellar transaction hash',
  })
  @IsString()
  transactionHash: string;

  @ApiProperty({
    example: 'success',
    enum: ['pending', 'success', 'failed'],
    description: 'Current status of the transaction',
  })
  @IsString()
  status: 'pending' | 'success' | 'failed';

  @ApiPropertyOptional({
    example: 456789,
    description: 'Ledger sequence number in which the transaction was closed',
  })
  @IsNumber()
  @IsOptional()
  ledger?: number;

  @ApiPropertyOptional({
    example: '2026-05-27T12:00:00.000Z',
    description: 'ISO 8601 UTC timestamp of transaction creation',
  })
  @IsOptional()
  createdAt?: Date;

  @ApiPropertyOptional({
    example: '0.0000100',
    description: 'Fee charged for the transaction in XLM',
  })
  @IsString()
  @IsOptional()
  fee?: string;

  @ApiPropertyOptional({
    type: [OperationRecordDto],
    description: 'List of operations contained within the transaction',
  })
  @IsOptional()
  operations?: OperationRecordDto[];
}
