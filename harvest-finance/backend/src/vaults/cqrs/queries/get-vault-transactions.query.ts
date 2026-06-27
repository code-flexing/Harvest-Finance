export class GetVaultTransactionsQuery {
  constructor(public readonly vaultId: string, public readonly limit = 50) {}
}
