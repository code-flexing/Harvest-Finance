import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SavingsProjectionService } from './services/savings-projection.service';
import { BudgetRecommendationService } from './services/budget-recommendation.service';
import { AlertsService } from './services/alerts.service';
import { HistoricalAnalyticsService } from './services/historical-analytics.service';
import { WeatherService } from './services/weather.service';
import { CropAdvisoryService } from './services/crop-advisory.service';

@ApiTags('Farm Intelligence')
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Savings projection', description: 'Projects vault savings growth over a given number of months for the specified user.' })
  @ApiQuery({ name: 'userId', description: 'User ID (UUID)' })
  @ApiQuery({ name: 'months', required: false, description: 'Projection horizon in months (default 6)' })
  @ApiResponse({ status: 200, description: 'Projection data returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Budget recommendation', description: 'Returns a recommended farm budget allocation for the specified user based on their vault history.' })
  @ApiQuery({ name: 'userId', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Budget recommendation returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getBudget(@Query('userId') userId: string) {
    return this.budgetService.getRecommendation(userId);
  }

  @Get('alerts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Farm alerts', description: 'Returns active financial and operational alerts for the specified user (e.g. low balance, overspending).' })
  @ApiQuery({ name: 'userId', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Alerts returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAlerts(@Query('userId') userId: string) {
    return this.alertsService.getAlerts(userId);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Historical analytics', description: 'Returns time-series transaction history, monthly deposits, and vault growth for the specified user.' })
  @ApiQuery({ name: 'userId', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Analytics data returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAnalytics(@Query('userId') userId: string) {
    return this.analyticsService.getAnalytics(userId);
  }

  @Get('weather')
  @ApiOperation({ summary: 'Weather summary', description: 'Returns current weather, a 7-day forecast, and agricultural alerts for a given location. Public endpoint — no auth required.' })
  @ApiQuery({ name: 'latitude', required: false, description: 'Latitude coordinate' })
  @ApiQuery({ name: 'longitude', required: false, description: 'Longitude coordinate' })
  @ApiQuery({ name: 'location', required: false, description: 'Named location (city or region) — used when coordinates are not provided' })
  @ApiResponse({ status: 200, description: 'Weather summary returned' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crop recommendations', description: 'Returns AI-driven crop advisory recommendations (planting, fertilization, irrigation, pest management) for the specified user.' })
  @ApiQuery({ name: 'userId', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Recommendations returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getRecommendations(@Query('userId') userId: string) {
    return this.advisoryService.getAdvice(userId);
  }
}
