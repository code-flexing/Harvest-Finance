import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ example: 'maize', description: 'Type of crop being assessed' })
  @IsString()
  cropType: string;

  @ApiProperty({ example: 'WET', description: "Season: 'DRY' | 'WET' | 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER'" })
  @IsString()
  season: string;

  @ApiProperty({ example: 800, description: 'Historical average yield in kg/acre (0 if unknown)' })
  @IsNumber()
  @Min(0)
  historicalYieldKgAcre: number;

  @ApiProperty({ example: 10, description: 'Farm area in acres' })
  @IsNumber()
  @IsPositive()
  farmAreaAcres: number;

  @ApiProperty({ example: 0.5, description: 'Estimated market price per kg in USD' })
  @IsNumber()
  @IsPositive()
  marketPricePerKg: number;

  @ApiProperty({ example: 75, description: 'Soil quality index 0–100' })
  @IsNumber()
  @Min(0)
  @Max(100)
  soilQualityIndex: number;

  @ApiProperty({ example: 30, description: 'Drought risk index 0–100 (higher = riskier)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  droughtRiskIndex: number;

  @ApiProperty({ example: 20, description: 'Flood risk index 0–100' })
  @IsNumber()
  @Min(0)
  @Max(100)
  floodRiskIndex: number;

  @ApiProperty({ example: 40, description: 'Market volatility index 0–100' })
  @IsNumber()
  @Min(0)
  @Max(100)
  marketVolatilityIndex: number;
}

export class SubscribeInsuranceDto {
  @ApiProperty({ example: 'plan-uuid', description: 'ID of the insurance plan to subscribe to' })
  @IsUUID()
  planId: string;

  @ApiProperty({ example: 'maize', description: 'Crop type being insured' })
  @IsString()
  cropType: string;

  @ApiProperty({ example: 5000, description: 'Total insured value in USD' })
  @IsNumber()
  @IsPositive()
  insuredValue: number;

  @ApiPropertyOptional({ example: 'vault-uuid', description: 'Optional Farm Vault ID to link for automatic premium tracking' })
  @IsOptional()
  @IsUUID()
  farmVaultId?: string;
}
