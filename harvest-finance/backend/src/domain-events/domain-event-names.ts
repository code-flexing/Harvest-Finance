export const DomainEventNames = {
  DEPOSIT_COMPLETED: 'vault.deposit.completed',
  WITHDRAWAL_COMPLETED: 'vault.withdrawal.completed',
  WITHDRAWAL_CONFIRMED: 'vault.withdrawal.confirmed',
  ESCROW_CHANGED: 'escrow.changed',
} as const;

export type DomainEventName =
  (typeof DomainEventNames)[keyof typeof DomainEventNames];
