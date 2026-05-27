import { ApiProperty } from '@nestjs/swagger';

export class ChainYieldAssetDto {
  @ApiProperty({ example: 'XLM' })
  code: string;

  @ApiProperty({
    example: null,
    nullable: true,
    description:
      'Asset issuer (Stellar) or contract address (EVM). Null for native.',
  })
  issuer: string | null;
}

export class ChainYieldDto {
  @ApiProperty({ example: 'stellar' })
  chain: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  positionId: string;

  @ApiProperty({ example: 'Maize Production Vault' })
  positionName: string;

  @ApiProperty({ example: '1500.0000000' })
  principal: string;

  @ApiProperty({ type: ChainYieldAssetDto })
  asset: ChainYieldAssetDto;

  @ApiProperty({ example: 7.5, nullable: true })
  apr: number | null;

  @ApiProperty({ example: '112.5000000', nullable: true })
  estimatedAnnualYield: string | null;

  @ApiProperty({ required: false, type: Object })
  metadata?: Record<string, unknown>;
}

export class ChainErrorDto {
  @ApiProperty({ example: 'ethereum' })
  chain: string;

  @ApiProperty({ example: 'RPC timeout' })
  message: string;
}

export class MultiChainYieldsDto {
  @ApiProperty({ example: 'a3f1c1c5-...-...-...-...' })
  userId: string;

  @ApiProperty({ example: '2026-04-26T18:42:11.012Z' })
  generatedAt: string;

  @ApiProperty({ type: [ChainYieldDto] })
  positions: ChainYieldDto[];

  @ApiProperty({ example: ['stellar'] })
  chainsQueried: string[];

  @ApiProperty({
    type: [ChainErrorDto],
    description:
      'Chains whose adapter threw — the rest of the response is still valid.',
  })
  errors: ChainErrorDto[];
}
