export type EscrowChangeAction = 'created' | 'released' | 'refunded';

export class EscrowChangedEvent {
  constructor(
    public readonly action: EscrowChangeAction,
    public readonly orderId: string,
    public readonly transactionHash?: string,
    public readonly balanceId?: string,
    public readonly amount?: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
