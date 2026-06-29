import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vault } from '../database/entities/vault.entity';
import { ScoringService } from './scoring.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vault])],
  providers: [ScoringService],
  controllers: [AnalyticsController],
  exports: [ScoringService],
})
export class AnalyticsModule {}
