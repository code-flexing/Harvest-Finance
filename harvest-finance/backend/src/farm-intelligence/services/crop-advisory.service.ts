import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FarmVault } from '../../database/entities/farm-vault.entity';
import { WeatherService } from './weather.service';
import { CropPriceService } from './crop-price.service';
import { CropAdvisory, CropRecommendation } from '../dto/intelligence.dto';

@Injectable()
export class CropAdvisoryService {
  private readonly logger = new Logger(CropAdvisoryService.name);

  constructor(
    @InjectRepository(FarmVault)
    private readonly farmVaultRepo: Repository<FarmVault>,
    private readonly weatherService: WeatherService,
    private readonly cropPriceService: CropPriceService,
  ) {}

  async getAdvice(userId: string): Promise<CropAdvisory> {
    this.logger.log(`Generating crop advisory for user ${userId}`);

    // 1. Gather Context
    const vaults = await this.farmVaultRepo.find({
      where: { userId },
      relations: ['cropCycle'],
    });

    const weather = await this.weatherService.getWeatherSummary({});
    const marketInsights = await this.cropPriceService.getInsights();

    // 2. Build Recommendations based on context
    const recommendations: CropRecommendation[] = [];

    // Weather-based advice
    if (weather.current.condition.toLowerCase().includes('rain')) {
      recommendations.push({
        topic: 'irrigation',
        title: 'Adjust Irrigation for Rain',
        advice:
          'Current rainfall detected. Reduce scheduled irrigation to prevent soil waterlogging.',
        impact: 'Saves water and prevents root rot.',
        priority: 'high',
      });
    } else if (weather.current.temperatureC > 30) {
      recommendations.push({
        topic: 'irrigation',
        title: 'Increase Hydration',
        advice:
          'High temperatures detected. Increase irrigation frequency during early morning or late evening.',
        impact: 'Prevents heat stress and wilting.',
        priority: 'medium',
      });
    }

    // Vault/Crop based advice
    for (const vault of vaults) {
      const cropName = vault.cropCycle?.name || 'Crop';

      // Simulated growth stage logic based on startDate
      const daysSinceStart = Math.floor(
        (new Date().getTime() - new Date(vault.startDate).getTime()) /
          (1000 * 3600 * 24),
      );

      if (daysSinceStart < 15) {
        recommendations.push({
          topic: 'planting',
          title: `Seedling Care for ${cropName}`,
          advice: `Your ${cropName} is in the early sprout stage. Ensure soil is consistently moist and free of weeds.`,
          impact: 'Critical for establishment phase.',
          priority: 'high',
        });
      } else if (daysSinceStart > 30 && daysSinceStart < 45) {
        recommendations.push({
          topic: 'fertilization',
          title: `Nutrient Boost for ${cropName}`,
          advice: `Time for a nitrogen-rich fertilizer application to support leaf and stem growth.`,
          impact: 'Increases vegetative mass and future yield.',
          priority: 'medium',
        });
      }

      // Market-based advice
      const marketMatch = marketInsights.find(
        (m) => m.crop.toLowerCase() === cropName.toLowerCase(),
      );
      if (marketMatch?.isHighDemand) {
        recommendations.push({
          topic: 'pest_management',
          title: 'Protect High-Value Yield',
          advice: `${cropName} market prices are high. Increase pest monitoring to ensure maximum marketable yield.`,
          impact: 'Maximizes financial returns.',
          priority: 'medium',
        });
      }
    }

    // Default recommendation if list is empty
    if (recommendations.length === 0) {
      recommendations.push({
        topic: 'pest_management',
        title: 'Routine Monitoring',
        advice:
          'No urgent alerts. Maintain regular scouting for pests and soil moisture checks.',
        impact: 'Ensures long-term crop health.',
        priority: 'low',
      });
    }

    return {
      userId,
      recommendations: recommendations.slice(0, 5), // Limit to top 5
      generatedAt: new Date().toISOString(),
      context: {
        weatherSummary: `${weather.current.condition}, ${weather.current.temperatureC}°C`,
        marketTrend:
          marketInsights.length > 0
            ? 'Prices are stabilizing'
            : 'Market data limited',
        soilHealth: 'Optimal based on seasonal trends',
      },
    };
  }
}
