  @ApiProperty({
    example: 5.5,
    description: 'Annual Percentage Rate (stated rate without compounding)',
  })
  apr: number;

  @ApiProperty({
    example: 5.65,
    description: 'Annual Percentage Yield (effective annual yield with compounding)',
  })
  apy: number;

  @ApiProperty({
    example: 'daily',
    description: 'Compounding frequency',
    enum: ['daily', 'weekly', 'monthly'],
  })
  compoundingFrequency: 'daily' | 'weekly' | 'monthly';

  @ApiProperty({
    example: '2024-12-31T23:59:59Z',
    description: 'Vault maturity date',
    required: false,
  })
  maturityDate: Date | null;