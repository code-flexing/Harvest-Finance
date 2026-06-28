import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vault } from '../database/entities/vault.entity';
import { Deposit } from '../database/entities/deposit.entity';
import { ScoringService } from './scoring.service';
import { RiskService } from './risk.service';
import { AnalyticsController } from './analytics.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Vault, Deposit]), NotificationsModule],
  providers: [ScoringService, RiskService],
  controllers: [AnalyticsController],
  exports: [ScoringService, RiskService],
})
export class AnalyticsModule {}
