import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vault } from '../database/entities/vault.entity';
import { Deposit } from '../database/entities/deposit.entity';
import { StateSyncService } from './state-sync.service';
import { StateSyncController } from './state-sync.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vault, Deposit])],
  controllers: [StateSyncController],
  providers: [StateSyncService],
  exports: [StateSyncService],
})
export class StateSyncModule {}
