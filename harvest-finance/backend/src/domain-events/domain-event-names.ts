export const DomainEventNames = {
  DEPOSIT_COMPLETED: 'vault.deposit.completed',
  WITHDRAWAL_COMPLETED: 'vault.withdrawal.completed',
  ESCROW_CHANGED: 'escrow.changed',
} as const;

export type DomainEventName =
  (typeof DomainEventNames)[keyof typeof DomainEventNames];
