import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vault } from '../database/entities/vault.entity';
import { Deposit } from '../database/entities/deposit.entity';
import { AuthModule } from '../auth/auth.module';
import { FarmIntelligenceController } from './farm-intelligence.controller';
import { SavingsProjectionService } from './services/savings-projection.service';
import { BudgetRecommendationService } from './services/budget-recommendation.service';
import { AlertsService } from './services/alerts.service';
import { HistoricalAnalyticsService } from './services/historical-analytics.service';
import { WeatherService } from './services/weather.service';
import { CropAdvisoryService } from './services/crop-advisory.service';
import { CropPriceService } from './services/crop-price.service';
import { FarmVault } from '../database/entities/farm-vault.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vault, Deposit, FarmVault]), AuthModule],
  controllers: [FarmIntelligenceController],
  providers: [
    SavingsProjectionService,
    BudgetRecommendationService,
    AlertsService,
    HistoricalAnalyticsService,
    WeatherService,
    CropAdvisoryService,
    CropPriceService,
  ],
  exports: [AlertsService, WeatherService, CropAdvisoryService],
})
export class FarmIntelligenceModule {}
