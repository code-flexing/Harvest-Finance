import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaultsController } from './vaults.controller';
import { VaultsService } from './vaults.service';
import { CommandHandlers } from './cqrs/commands/handlers';
import { QueryHandlers } from './cqrs/queries/handlers';
import { EventHandlers } from './cqrs/events/handlers';
import { VaultReadRepository } from './read/vault-read.repository';
import { Vault } from '../database/entities/vault.entity';
import { Deposit } from '../database/entities/deposit.entity';
import { DepositEvent } from '../database/entities/deposit-event.entity';
import { Withdrawal } from '../database/entities/withdrawal.entity';
import { VaultApyHistory } from '../database/entities/vault-apy-history.entity';
import { DepositEventService } from './deposit-event.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { CommonModule } from '../common/common.module';
import { WithdrawalConfirmedHandler } from './events/withdrawal-confirmed.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vault, Deposit, DepositEvent, Withdrawal, VaultApyHistory]),
    AuthModule,
    NotificationsModule,
    RealtimeModule,
    CommonModule,
  ],
  controllers: [VaultsController],
  providers: [VaultsService, DepositEventService, WithdrawalConfirmedHandler],
  exports: [VaultsService, DepositEventService],
})
export class VaultsModule {}
