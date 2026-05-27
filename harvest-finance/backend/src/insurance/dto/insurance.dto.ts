import {
  IsString,
  IsNumber,
  IsPositive,
  IsUUID,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class RiskAssessmentDto {
  @IsString()
  cropType: string;

  /**
   * Season: 'DRY' | 'WET' | 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER'
   */
  @IsString()
  season: string;

  /** Historical average yield in kg/acre (0 if unknown) */
  @IsNumber()
  @Min(0)
  historicalYieldKgAcre: number;

  /** Farm area in acres */
  @IsNumber()
  @IsPositive()
  farmAreaAcres: number;

  /** Estimated market price per kg in USD */
  @IsNumber()
  @IsPositive()
  marketPricePerKg: number;

  /** Soil quality index 0–100 */
  @IsNumber()
  @Min(0)
  @Max(100)
  soilQualityIndex: number;

  /** Drought risk index 0–100 (higher = riskier) */
  @IsNumber()
  @Min(0)
  @Max(100)
  droughtRiskIndex: number;

  /** Flood risk index 0–100 */
  @IsNumber()
  @Min(0)
  @Max(100)
  floodRiskIndex: number;

  /** Market volatility index 0–100 */
  @IsNumber()
  @Min(0)
  @Max(100)
  marketVolatilityIndex: number;
}

export class SubscribeInsuranceDto {
  @IsUUID()
  planId: string;

  @IsString()
  cropType: string;

  @IsNumber()
  @IsPositive()
  insuredValue: number;

  /** Optional Farm Vault ID to link for automatic premium tracking */
  @IsOptional()
  @IsUUID()
  farmVaultId?: string;
}
