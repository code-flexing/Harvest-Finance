export class VaultDebitedEvent {
  constructor(public readonly vaultId: string, public readonly userId: string, public readonly amount: number) {}
}
