import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SavingsProjectionService } from './services/savings-projection.service';
import { BudgetRecommendationService } from './services/budget-recommendation.service';
import { AlertsService } from './services/alerts.service';
import { HistoricalAnalyticsService } from './services/historical-analytics.service';
import { WeatherService } from './services/weather.service';
import { CropAdvisoryService } from './services/crop-advisory.service';

@Controller({
  path: 'farm-intelligence',
  version: '1',
})
export class FarmIntelligenceController {
  constructor(
    private readonly projectionService: SavingsProjectionService,
    private readonly budgetService: BudgetRecommendationService,
    private readonly alertsService: AlertsService,
    private readonly analyticsService: HistoricalAnalyticsService,
    private readonly weatherService: WeatherService,
    private readonly advisoryService: CropAdvisoryService,
  ) {}

  @Get('projection')
  @UseGuards(JwtAuthGuard)
  getProjection(
    @Query('userId') userId: string,
    @Query('months') months: string,
  ) {
    return this.projectionService.projectSavings(
      userId,
      parseInt(months || '6', 10),
    );
  }

  @Get('budget')
  @UseGuards(JwtAuthGuard)
  getBudget(@Query('userId') userId: string) {
    return this.budgetService.getRecommendation(userId);
  }

  @Get('alerts')
  @UseGuards(JwtAuthGuard)
  getAlerts(@Query('userId') userId: string) {
    return this.alertsService.getAlerts(userId);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  getAnalytics(@Query('userId') userId: string) {
    return this.analyticsService.getAnalytics(userId);
  }

  @Get('weather')
  getWeather(
    @Query('latitude') latitude?: number,
    @Query('longitude') longitude?: number,
    @Query('location') location?: string,
  ) {
    return this.weatherService.getWeatherSummary({
      latitude,
      longitude,
      location,
    });
  }

  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  getRecommendations(@Query('userId') userId: string) {
    return this.advisoryService.getAdvice(userId);
  }
}
