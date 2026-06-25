import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [TerminusModule, StellarModule],
  controllers: [HealthController],
})
export class HealthModule {}
