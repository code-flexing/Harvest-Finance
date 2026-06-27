## Summary
Adds typed domain events for vault deposits, vault withdrawals, and escrow lifecycle changes using NestJS `EventEmitter2`.

## Purpose / Motivation
Event-driven side effects are easier to test and extend than scattering direct service calls. Downstream features (analytics, notifications, audit logs) can subscribe with `@OnEvent` without modifying core vault or Stellar flows.

## Changes Made
- Introduced `DomainEventsModule` (global) with event name constants and typed payloads:
  - `DepositCompletedEvent` (`vault.deposit.completed`)
  - `WithdrawalCompletedEvent` (`vault.withdrawal.completed`)
  - `EscrowChangedEvent` (`escrow.changed`) with actions `created`, `released`, `refunded`
- `VaultsService` emits deposit/withdrawal events after successful confirmation
- `OrdersService` emits escrow events when orders enter escrow or upfront payment is released
- `StellarService` emits escrow events on create, release, and refund
- Unit test mocks updated for `EventEmitter2` injection

## How to Test
1. Run backend unit tests: `cd harvest-finance/backend && npm test`
2. Deposit to a vault via API; add a temporary `@OnEvent(DomainEventNames.DEPOSIT_COMPLETED)` handler and confirm payload includes `depositId`, `userId`, `vaultId`, and `amount`
3. Withdraw from a vault; confirm `vault.withdrawal.completed` fires with matching withdrawal id
4. Accept an order (escrow created) or call Stellar escrow endpoints; confirm `escrow.changed` events with the expected `action`

## Screenshots (if applicable)
N/A — backend-only change.

## Breaking Changes
- None. Existing WebSocket and notification behavior is unchanged; events are additive.

## Related Issues
Closes code-flexing/Harvest-Finance#382

## Checklist
- [x] Code builds successfully
- [x] Tests added/updated
- [x] No console errors
- [ ] Documentation updated (if needed)
