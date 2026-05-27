import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class AssetBalance {
  @Field()
  assetCode: string;

  @Field({ nullable: true })
  assetIssuer?: string | null;

  @Field()
  balance: string;
}

@ObjectType()
export class StellarAccountSnapshot {
  @Field()
  publicKey: string;

  @Field()
  exists: boolean;

  @Field(() => [AssetBalance])
  balances: AssetBalance[];

  @Field({ nullable: true })
  error?: string | null;
}

@ObjectType()
export class VaultHolding {
  @Field()
  vaultId: string;

  @Field()
  vaultName: string;

  @Field()
  vaultType: string;

  @Field(() => Float)
  balance: number;
}

@ObjectType()
export class PortfolioResponse {
  @Field()
  userId: string;

  @Field()
  generatedAt: string;

  @Field(() => [StellarAccountSnapshot])
  accounts: StellarAccountSnapshot[];

  @Field(() => [AssetBalance])
  aggregatedStellarBalances: AssetBalance[];

  @Field(() => [VaultHolding])
  vaults: VaultHolding[];

  @Field(() => Float)
  totalVaultBalance: number;
}
