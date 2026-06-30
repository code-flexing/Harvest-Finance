import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Vault } from '../database/entities/vault.entity';
import { Deposit } from '../database/entities/deposit.entity';
import { Withdrawal } from '../database/entities/withdrawal.entity';
import { VaultApyHistory } from '../database/entities/vault-apy-history.entity';
import { VaultScoreHistory } from '../database/entities/vault-score-history.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsInterceptor } from './analytics.interceptor';
import { ScoringService } from './scoring.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vault, Deposit, Withdrawal, VaultApyHistory, VaultScoreHistory]),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    ScoringService,
    { provide: APP_INTERCEPTOR, useClass: AnalyticsInterceptor },
  ],
  exports: [AnalyticsService, ScoringService],
})
export class AnalyticsModule {}
