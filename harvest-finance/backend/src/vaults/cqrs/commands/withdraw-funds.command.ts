export class WithdrawFundsCommand {
  constructor(
    public readonly vaultId: string,
    public readonly userId: string,
    public readonly amount: number,
  ) {}
}
