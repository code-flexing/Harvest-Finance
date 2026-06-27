export class VaultCreatedEvent {
  constructor(
    public readonly vaultId: string,
    public readonly ownerId: string,
    public readonly vaultName: string,
    public readonly vaultType: string,
    public readonly maxCapacity: number,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
