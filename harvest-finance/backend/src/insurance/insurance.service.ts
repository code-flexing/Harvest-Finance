import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InsurancePlan,
  InsurancePlanType,
  RiskLevel,
} from '../database/entities/insurance-plan.entity';
import {
  InsuranceSubscription,
  SubscriptionStatus,
} from '../database/entities/insurance-subscription.entity';
import { FarmVault } from '../database/entities/farm-vault.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../database/entities/notification.entity';
import { RiskAssessmentDto, SubscribeInsuranceDto } from './dto/insurance.dto';

/** ---------- Types returned to controllers ---------- */

export interface RiskFactor {
  name: string;
  score: number; // 0-100
  description: string;
}

export interface RiskAssessmentResult {
  cropType: string;
  season: string;
  overallScore: number; // 0-100
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  estimatedAnnualLossUsd: number;
  recommendedCoverage: number; // USD
}

export interface PlanRecommendation {
  plan: InsurancePlan;
  matchScore: number; // 0-100
  estimatedMonthlyPremium: number;
  estimatedAnnualPremium: number;
  estimatedCoverage: number;
  rationale: string;
}

/** ---------- Crop-risk profiles (drought / flood / market volatility weights) ---------- */

const CROP_BASE_RISK: Record<
  string,
  { drought: number; flood: number; market: number }
> = {
  MAIZE: { drought: 0.35, flood: 0.25, market: 0.2 },
  WHEAT: { drought: 0.3, flood: 0.2, market: 0.25 },
  RICE: { drought: 0.2, flood: 0.45, market: 0.2 },
  SOYBEAN: { drought: 0.3, flood: 0.25, market: 0.35 },
  COTTON: { drought: 0.4, flood: 0.2, market: 0.3 },
  TOMATO: { drought: 0.25, flood: 0.35, market: 0.25 },
  POTATO: { drought: 0.2, flood: 0.4, market: 0.2 },
  COFFEE: { drought: 0.45, flood: 0.15, market: 0.35 },
  SUGARCANE: { drought: 0.3, flood: 0.3, market: 0.2 },
  GENERAL: { drought: 0.33, flood: 0.33, market: 0.25 },
};

/** Season modifier: adds extra risk points. */
const SEASON_RISK_BONUS: Record<string, number> = {
  DRY: 10,
  WET: 8,
  SUMMER: 6,
  WINTER: 5,
  SPRING: 2,
  AUTUMN: 2,
};

@Injectable()
export class InsuranceService {
  constructor(
    @InjectRepository(InsurancePlan)
    private planRepo: Repository<InsurancePlan>,
    @InjectRepository(InsuranceSubscription)
    private subscriptionRepo: Repository<InsuranceSubscription>,
    @InjectRepository(FarmVault)
    private farmVaultRepo: Repository<FarmVault>,
    private notificationsService: NotificationsService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Risk Assessment
  // ─────────────────────────────────────────────────────────────────────────────

  assessRisk(dto: RiskAssessmentDto): RiskAssessmentResult {
    const cropKey = dto.cropType.toUpperCase();
    const weights = CROP_BASE_RISK[cropKey] ?? CROP_BASE_RISK['GENERAL'];

    // Weighted sub-scores
    const droughtScore = dto.droughtRiskIndex * weights.drought;
    const floodScore = dto.floodRiskIndex * weights.flood;
    const marketScore = dto.marketVolatilityIndex * weights.market;
    const soilPenalty = Math.max(0, 50 - dto.soilQualityIndex) * 0.4; // poor soil ↑ risk
    const yieldPenalty = dto.historicalYieldKgAcre === 0 ? 10 : 0; // no data = extra risk
    const seasonBonus = SEASON_RISK_BONUS[dto.season.toUpperCase()] ?? 3;

    let overallScore = Math.min(
      100,
      droughtScore +
        floodScore +
        marketScore +
        soilPenalty +
        yieldPenalty +
        seasonBonus,
    );
    overallScore = Math.round(overallScore);

    const riskLevel =
      overallScore >= 75
        ? RiskLevel.VERY_HIGH
        : overallScore >= 50
          ? RiskLevel.HIGH
          : overallScore >= 25
            ? RiskLevel.MEDIUM
            : RiskLevel.LOW;

    const farmValue =
      dto.historicalYieldKgAcre * dto.farmAreaAcres * dto.marketPricePerKg;
    const estimatedAnnualLossUsd = Math.round(
      farmValue * (overallScore / 100) * 0.4,
    );
    const recommendedCoverage = Math.round(farmValue * 0.8);

    const factors: RiskFactor[] = [
      {
        name: 'Drought Risk',
        score: Math.round(droughtScore),
        description: `Drought risk index (${dto.droughtRiskIndex}/100) weighted for ${dto.cropType}`,
      },
      {
        name: 'Flood Risk',
        score: Math.round(floodScore),
        description: `Flood risk index (${dto.floodRiskIndex}/100) weighted for ${dto.cropType}`,
      },
      {
        name: 'Market Volatility',
        score: Math.round(marketScore),
        description: `Market price volatility index (${dto.marketVolatilityIndex}/100)`,
      },
      {
        name: 'Soil Quality',
        score: Math.round(soilPenalty),
        description: `Soil quality index ${dto.soilQualityIndex}/100 – lower soil quality increases risk`,
      },
      {
        name: 'Seasonal Factor',
        score: seasonBonus,
        description: `${dto.season} season risk adjustment`,
      },
    ];

    return {
      cropType: dto.cropType,
      season: dto.season,
      overallScore,
      riskLevel,
      factors,
      estimatedAnnualLossUsd,
      recommendedCoverage,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Plan Matching
  // ─────────────────────────────────────────────────────────────────────────────

  async getRecommendations(dto: RiskAssessmentDto): Promise<{
    assessment: RiskAssessmentResult;
    recommendations: PlanRecommendation[];
  }> {
    const assessment = this.assessRisk(dto);
    const plans = await this.planRepo.find({ where: { isActive: true } });

    const recommendations: PlanRecommendation[] = plans
      .filter((plan) => {
        // Filter by applicable risk level
        const levels = plan.applicableRiskLevels
          .split(',')
          .map((l) => l.trim());
        if (!levels.includes(assessment.riskLevel)) return false;

        // Filter by crop type (empty = all crops)
        if (plan.applicableCrops) {
          const crops = plan.applicableCrops
            .split(',')
            .map((c) => c.trim().toUpperCase());
          if (crops.length > 0 && !crops.includes(dto.cropType.toUpperCase()))
            return false;
        }
        return true;
      })
      .map((plan) => {
        const premium = Number(plan.premiumRate);
        const coverage =
          assessment.recommendedCoverage * Number(plan.coverageMultiplier);
        const annualPremium = Math.round(coverage * premium * 100) / 100;
        const monthlyPremium = Math.round((annualPremium / 12) * 100) / 100;

        // Match score: higher coverage multiplier + lower premium = better match for farmers
        const matchScore = Math.min(
          100,
          Math.round(
            60 * Number(plan.coverageMultiplier) +
              20 * (1 - premium) +
              this.riskLevelCompat(assessment.riskLevel, plan.planType),
          ),
        );

        return {
          plan,
          matchScore,
          estimatedMonthlyPremium: monthlyPremium,
          estimatedAnnualPremium: annualPremium,
          estimatedCoverage: Math.round(coverage),
          rationale: this.buildRationale(plan, assessment),
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    return { assessment, recommendations };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Subscription management
  // ─────────────────────────────────────────────────────────────────────────────

  async subscribe(
    userId: string,
    dto: SubscribeInsuranceDto,
  ): Promise<InsuranceSubscription> {
    const plan = await this.planRepo.findOne({
      where: { id: dto.planId, isActive: true },
    });
    if (!plan) {
      throw new NotFoundException('Insurance plan not found');
    }

    if (dto.insuredValue <= 0) {
      throw new BadRequestException('Insured value must be greater than 0');
    }

    // Validate farm vault belongs to user (if provided)
    if (dto.farmVaultId) {
      const vault = await this.farmVaultRepo.findOne({
        where: { id: dto.farmVaultId, userId },
      });
      if (!vault) {
        throw new NotFoundException(
          'Farm vault not found or does not belong to this user',
        );
      }
    }

    const premium = Number(plan.premiumRate);
    const monthlyPremium =
      Math.round(((dto.insuredValue * premium) / 12) * 100) / 100;

    const coverageStart = new Date();
    const coverageEnd = new Date();
    coverageEnd.setFullYear(coverageEnd.getFullYear() + 1);

    const subscription = this.subscriptionRepo.create({
      userId,
      planId: plan.id,
      cropType: dto.cropType,
      insuredValue: dto.insuredValue,
      monthlyPremium,
      status: SubscriptionStatus.ACTIVE,
      coverageStart,
      coverageEnd,
      farmVaultId: dto.farmVaultId ?? null,
      riskScoreAtSubscription: 0,
    });

    const saved = await this.subscriptionRepo.save(subscription);

    // Notify the farmer
    await this.notificationsService.create({
      userId,
      title: 'Insurance Plan Activated',
      message: `Your "${plan.name}" crop insurance is now active. Monthly premium: $${monthlyPremium.toFixed(2)}. Coverage period: ${coverageStart.toLocaleDateString()} – ${coverageEnd.toLocaleDateString()}.`,
      type: NotificationType.INSURANCE,
    });

    return saved;
  }

  async getUserSubscriptions(userId: string): Promise<InsuranceSubscription[]> {
    return this.subscriptionRepo.find({
      where: { userId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAvailablePlans(): Promise<InsurancePlan[]> {
    return this.planRepo.find({
      where: { isActive: true },
      order: { planType: 'ASC' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Renewal alerts
  // ─────────────────────────────────────────────────────────────────────────────

  /** Call this from a scheduled task / cron to alert users about upcoming renewals */
  async sendRenewalAlerts(): Promise<number> {
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

    const expiring = await this.subscriptionRepo
      .createQueryBuilder('sub')
      .leftJoinAndSelect('sub.plan', 'plan')
      .where('sub.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('sub.coverage_end <= :deadline', { deadline: thirtyDaysAhead })
      .getMany();

    for (const sub of expiring) {
      await this.notificationsService.create({
        userId: sub.userId,
        title: 'Insurance Renewal Reminder',
        message: `Your "${sub.plan.name}" insurance coverage expires on ${new Date(sub.coverageEnd).toLocaleDateString()}. Renew now to maintain protection for your ${sub.cropType} crop.`,
        type: NotificationType.INSURANCE,
      });
    }

    return expiring.length;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private riskLevelCompat(
    level: RiskLevel,
    planType: InsurancePlanType,
  ): number {
    if (
      level === RiskLevel.VERY_HIGH &&
      planType === InsurancePlanType.COMPREHENSIVE
    )
      return 20;
    if (level === RiskLevel.HIGH && planType === InsurancePlanType.CROP_YIELD)
      return 15;
    if (
      level === RiskLevel.MEDIUM &&
      planType === InsurancePlanType.WEATHER_INDEX
    )
      return 15;
    if (level === RiskLevel.LOW && planType === InsurancePlanType.MARKET_PRICE)
      return 15;
    return 5;
  }

  private buildRationale(
    plan: InsurancePlan,
    assessment: RiskAssessmentResult,
  ): string {
    const coveragePct = Math.round(Number(plan.coverageMultiplier) * 100);
    const parts: string[] = [];

    parts.push(`Covers ${coveragePct}% of your insured value`);

    if (
      plan.planType === InsurancePlanType.WEATHER_INDEX &&
      (assessment.factors[0].score > 20 || assessment.factors[1].score > 20)
    ) {
      parts.push('well-suited for your elevated weather risk');
    }
    if (
      plan.planType === InsurancePlanType.MARKET_PRICE &&
      assessment.factors[2].score > 20
    ) {
      parts.push('protects against market price drops');
    }
    if (plan.planType === InsurancePlanType.COMPREHENSIVE) {
      parts.push('provides the broadest protection across all risk categories');
    }

    return parts.join(', ') + '.';
  }
}
