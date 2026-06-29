import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FarmVaultsService } from './farm-vaults.service';
import { FarmVaultsController } from './farm-vaults.controller';
import { FarmVault } from '../database/entities/farm-vault.entity';
import { CropCycle } from '../database/entities/crop-cycle.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([FarmVault, CropCycle]), RealtimeModule, AuthModule],
  controllers: [FarmVaultsController],
  providers: [FarmVaultsService],
  exports: [FarmVaultsService],
})
export class FarmVaultsModule {}
