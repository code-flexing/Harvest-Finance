export const DomainEventNames = {
  DEPOSIT_COMPLETED: 'vault.deposit.completed',
  WITHDRAWAL_COMPLETED: 'vault.withdrawal.completed',
  WITHDRAWAL_CONFIRMED: 'vault.withdrawal.confirmed',
  ESCROW_CHANGED: 'escrow.changed',
  VAULT_CREATED: 'vault.created',
  DEPOSIT_CONFIRMED: 'vault.deposit.confirmed',
  WITHDRAWAL_INITIATED: 'vault.withdrawal.initiated',
  VAULT_PAUSED: 'vault.paused',
  PAYMENT_RECEIVED: 'stellar.payment.received',
} as const;

export type DomainEventName =
  (typeof DomainEventNames)[keyof typeof DomainEventNames];
