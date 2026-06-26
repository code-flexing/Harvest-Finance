export class DepositFundsCommand {
  constructor(
    public readonly vaultId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly idempotencyKey?: string,
  ) {}
}
