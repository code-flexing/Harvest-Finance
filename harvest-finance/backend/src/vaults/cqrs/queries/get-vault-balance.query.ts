export class GetVaultBalanceQuery {
  constructor(public readonly vaultId: string, public readonly userId?: string) {}
}
