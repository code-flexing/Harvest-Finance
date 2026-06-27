export class WithdrawalConfirmedEvent {
  constructor(
    public readonly withdrawalId: string,
    public readonly userId: string,
    public readonly vaultId: string,
    public readonly amount: number,
    public readonly vaultName: string,
    public readonly newBalance: number,
    public readonly transactionHash: string | null,
    public readonly confirmedAt: Date,
    public readonly occurredAt: Date = new Date(),
  ) {}
}

