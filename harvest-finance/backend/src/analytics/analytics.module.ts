import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Vault } from '../database/entities/vault.entity';
import { Deposit } from '../database/entities/deposit.entity';
import { Withdrawal } from '../database/entities/withdrawal.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsInterceptor } from './analytics.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([Vault, Deposit, Withdrawal])],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    { provide: APP_INTERCEPTOR, useClass: AnalyticsInterceptor },
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
