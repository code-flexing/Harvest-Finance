import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../common/common.module';
import { StellarClientService } from './services/stellar-client.service';
import { StellarService } from './services/stellar.service';
import { StellarController } from './stellar.controller';

@Module({
  imports: [ConfigModule, CommonModule],
  providers: [StellarClientService, StellarService],
  controllers: [StellarController],
  exports: [StellarClientService, StellarService],
})
export class StellarModule {}
