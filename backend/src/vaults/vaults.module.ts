import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vault } from './entities/vault.entity';
import { VaultsService } from './vaults.service';
import { VaultsController } from './vaults.controller';
import { VaultRepository } from './vault.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Vault])],
  controllers: [VaultsController],
  providers: [VaultsService, VaultRepository],
  exports: [VaultsService],
})
export class VaultsModule {}
