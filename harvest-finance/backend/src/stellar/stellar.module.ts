import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../common/common.module';
import { StellarService } from './services/stellar.service';
import { StellarClientService } from './services/stellar-client.service';
import { StellarController } from './stellar.controller';

@Module({
  imports: [ConfigModule, CommonModule],
  providers: [StellarService, StellarClientService],
  controllers: [StellarController],
  exports: [StellarService, StellarClientService],
})
export class StellarModule {}
