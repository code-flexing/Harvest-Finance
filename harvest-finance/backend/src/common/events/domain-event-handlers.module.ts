import { Module } from '@nestjs/common';
import { VaultCreatedHandler } from './vault-created.handler';
import { DepositConfirmedHandler } from './deposit-confirmed.handler';
import { WithdrawalInitiatedHandler } from './withdrawal-initiated.handler';
import { WithdrawalCompletedHandler } from './withdrawal-completed.handler';
import { VaultPausedHandler } from './vault-paused.handler';

/**
 * DomainEventHandlersModule
 *
 * Registers all @OnEvent handler classes so NestJS can discover and wire them.
 * Requires EventEmitterModule to be imported globally (provided by DomainEventsModule).
 *
 * Handler errors are caught internally — a failing handler does NOT crash the emitter
 * or affect the originating request.
 */
@Module({
  providers: [
    VaultCreatedHandler,
    DepositConfirmedHandler,
    WithdrawalInitiatedHandler,
    WithdrawalCompletedHandler,
    VaultPausedHandler,
  ],
  exports: [
    VaultCreatedHandler,
    DepositConfirmedHandler,
    WithdrawalInitiatedHandler,
    WithdrawalCompletedHandler,
    VaultPausedHandler,
  ],
})
export class DomainEventHandlersModule {}
