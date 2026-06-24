export class VaultPausedEvent {
  constructor(
    public readonly vaultId: string,
    public readonly pausedByUserId: string,
    public readonly vaultName: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
