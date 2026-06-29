import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';
import { StellarHealthIndicator } from './stellar.health';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [TerminusModule, StellarModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator, StellarHealthIndicator],
})
export class HealthModule {}
