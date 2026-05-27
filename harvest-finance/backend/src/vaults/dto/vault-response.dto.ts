import { ApiProperty } from '@nestjs/swagger';
import {
  Vault,
  VaultType,
  VaultStatus,
} from '../../database/entities/vault.entity';
import { Deposit } from '../../database/entities/deposit.entity';

export class VaultResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Vault unique identifier',
  })
  id: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Vault owner ID',
  })
  ownerId: string;

  @ApiProperty({
    enum: VaultType,
    example: 'CROP_PRODUCTION',
    description: 'Type of vault',
  })
  type: VaultType;

  @ApiProperty({
    enum: VaultStatus,
    example: 'ACTIVE',
    description: 'Current status of vault',
  })
  status: VaultStatus;

  @ApiProperty({
    example: 'My Crop Production Vault',
    description: 'Vault name',
  })
  vaultName: string;

  @ApiProperty({
    example: 'Vault for financing wheat production',
    description: 'Vault description',
    required: false,
  })
  description: string | null;

  @ApiProperty({
    example: 'HVF',
    description: 'Vault symbol',
  })
  symbol: string;

  @ApiProperty({
    example: 'XLM/USDC',
    description: 'Vault asset pair',
  })
  assetPair: string;

  @ApiProperty({
    example: 50000.5,
    description: 'Total deposits in vault',
  })
  totalDeposits: number;

  @ApiProperty({
    example: 100000.0,
    description: 'Maximum vault capacity',
  })
  maxCapacity: number;

  @ApiProperty({
    example: 50000.5,
    description: 'Available capacity remaining',
  })
  availableCapacity: number;

  @ApiProperty({
    example: 50.05,
    description: 'Vault utilization percentage',
  })
  utilizationPercentage: number;

  @ApiProperty({
    example: 5.5,
    description: 'Annual interest rate',
  })
  interestRate: number;

  @ApiProperty({
    example: '2024-12-31T23:59:59Z',
    description: 'Vault maturity date',
    required: false,
  })
  maturityDate: Date | null;

  @ApiProperty({
    example: '2024-06-30T23:59:59Z',
    description: 'Lock period end date',
    required: false,
  })
  lockPeriodEnd: Date | null;

  @ApiProperty({
    example: true,
    description: 'Whether vault is publicly visible',
  })
  isPublic: boolean;

  @ApiProperty({
    example: '2023-01-01T00:00:00Z',
    description: 'Vault creation date',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-12-01T10:30:00Z',
    description: 'Last update date',
  })
  updatedAt: Date;
}

export class DepositResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Deposit unique identifier',
  })
  id: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID who made the deposit',
  })
  userId: string;

  @ApiProperty({
    example: '456e7890-e89b-12d3-a456-426614174111',
    description: 'Vault ID where deposit was made',
  })
  vaultId: string;

  @ApiProperty({
    example: 'CONFIRMED',
    description: 'Deposit status',
  })
  status: string;

  @ApiProperty({
    example: 1000.5,
    description: 'Deposit amount',
  })
  amount: number;

  @ApiProperty({
    example: 'tx_hash_123456789',
    description: 'Blockchain transaction hash',
    required: false,
  })
  transactionHash: string | null;

  @ApiProperty({
    example: '2023-01-01T00:00:00Z',
    description: 'Deposit creation date',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-01-01T00:05:00Z',
    description: 'Deposit confirmation date',
    required: false,
  })
  confirmedAt: Date | null;
}

export class DepositVaultResponseDto {
  @ApiProperty({
    description: 'Updated vault information',
    type: VaultResponseDto,
    nullable: true,
  })
  vault: VaultResponseDto | null;

  @ApiProperty({
    description: 'Deposit information',
    type: DepositResponseDto,
  })
  deposit: DepositResponseDto;

  @ApiProperty({
    example: 25000.75,
    description: "User's total deposits across all vaults",
  })
  userTotalDeposits: number;
}
