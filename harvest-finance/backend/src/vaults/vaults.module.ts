import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaultsService } from './vaults.service';
import { VaultsController } from './vaults.controller';
import { Vault, VaultDeposit } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Vault, VaultDeposit])],
  controllers: [VaultsController],
  providers: [VaultsService],
  exports: [VaultsService],
})
export class VaultsModule {}
