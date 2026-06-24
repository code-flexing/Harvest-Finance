export class DepositConfirmedEvent {
  constructor(
    public readonly depositId: string,
    public readonly userId: string,
    public readonly vaultId: string,
    public readonly amount: number,
    public readonly transactionHash: string,
    public readonly confirmedAt: Date,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
