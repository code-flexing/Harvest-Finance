import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VaultMetricsDto {
  totalVaults: number;
  totalDepositsUsd: number;
  totalWithdrawalsUsd: number;
  activeVaults: number;
  avgUtilizationPct: number;
}

export class SystemMetricsDto {
  uptimeSeconds: number;
  totalApiRequests: number;
  totalErrors: number;
  errorRate: number;
  lastUpdatedAt: string;
}

export class TrackFunnelEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  eventName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  funnelName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  stepName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  sessionId: string;
}

export class FunnelStepSummaryDto {
  stepName: string;
  count: number;
}

export class FunnelConversionDto {
  funnelName: string;
  fromStep: string;
  toStep: string;
  conversionRatePct: number;
  uniqueSessionsAtStart: number;
  uniqueSessionsAtEnd: number;
  steps: FunnelStepSummaryDto[];
}
