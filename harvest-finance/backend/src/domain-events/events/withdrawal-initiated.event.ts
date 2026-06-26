export class WithdrawalInitiatedEvent {
  constructor(
    public readonly withdrawalId: string,
    public readonly userId: string,
    public readonly vaultId: string,
    public readonly amount: number,
    public readonly vaultName: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
