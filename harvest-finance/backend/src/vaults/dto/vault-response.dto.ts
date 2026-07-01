  @ApiProperty({
    example: 5.65,
    description: 'Annual Percentage Rate (APR)',
  })
  apr: number;

  @ApiProperty({
    example: 5.78,
    description: 'Annual Percentage Yield (APY)',
  })
  apy: number;

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
    example: false,
    description: 'Whether vault requires multi-signature approval',
  })
  requiresMultiSignature: boolean;

  @ApiProperty({
    example: 2,
    description: 'Number of approvals required for operations',
  })
  approvalThreshold: number;

  @ApiProperty({
    example: 1,
    description: 'Number of current approvals',
  })
  currentApprovals: number;

  @ApiProperty({
    example: 'PENDING',
    description: 'Current approval status (NOT_REQUIRED, PENDING, APPROVED)',
  })
  approvalStatus: string;

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

  @ApiProperty({ example: 50, description: 'Entry fee in basis points' })
  entryFeeBps: number;

  @ApiProperty({ example: 50, description: 'Exit fee in basis points' })
  exitFeeBps: number;

  @ApiProperty({ example: 1000, description: 'Performance fee in basis points' })
  performanceFeeBps: number;

  @ApiProperty({ example: 'GXXX...', description: 'Fee recipient address', required: false, nullable: true })
  feeAddress: string | null;
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

  @ApiProperty({ example: 5.0, description: 'Fee amount deducted' })
  feeAmount: number;

  @ApiProperty({ example: 995.0, description: 'Net amount credited after fee deduction' })
  netAmount: number;
}

export class BatchDepositResponseDto {
  @ApiProperty({
    description: 'Per-deposit results (in request order)',
    type: [DepositVaultResponseDto],
  })
  results: DepositVaultResponseDto[];

  @ApiProperty({
    example: 25000.75,
    description: "User's total deposits across all vaults after batch",
  })
  userTotalDeposits: number;
}
