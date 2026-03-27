import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
 feat/withdraw-api
import { VaultsService } from './vaults.service';
import { VaultsController } from './vaults.controller';
import { Vault, VaultDeposit } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Vault, VaultDeposit])],
=======
import { VaultsController } from './vaults.controller';
import { VaultsService } from './vaults.service';
import { Vault } from '../database/entities/vault.entity';
import { Deposit } from '../database/entities/deposit.entity';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vault, Deposit]),
    AuthModule,
    NotificationsModule,
  ],
 main
  controllers: [VaultsController],
  providers: [VaultsService],
  exports: [VaultsService],
})
export class VaultsModule {}
