export class PaymentReceivedEvent {
  constructor(
    public readonly transactionHash: string,
    public readonly from: string,
    public readonly to: string,
    public readonly amount: number,
    public readonly assetCode: string,
    public readonly memo?: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
