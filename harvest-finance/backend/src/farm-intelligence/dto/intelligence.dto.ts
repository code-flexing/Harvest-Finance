export interface MonthlyProjection {
  month: number;
  label: string;
  projectedBalance: number;
  cumulativeInterest: number;
}

export interface SavingsProjectionResult {
  currentBalance: number;
  projections: MonthlyProjection[];
  totalProjectedGrowth: number;
}

export interface BudgetCategory {
  category: 'seeds' | 'fertilizer' | 'labor' | 'savings';
  recommended: number;
  percentage: number;
}

export interface BudgetRecommendation {
  totalBudget: number;
  allocations: BudgetCategory[];
  rationale: string;
}

export interface Alert {
  type: 'OVERSPENDING' | 'SAVINGS_THRESHOLD' | 'LOW_BALANCE';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  triggeredAt: string;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string;
}

export interface HistoricalAnalytics {
  transactionHistory: TimeSeriesPoint[];
  monthlyDeposits: TimeSeriesPoint[];
  vaultGrowth: TimeSeriesPoint[];
}

export interface CropRecommendation {
  topic: 'planting' | 'fertilization' | 'irrigation' | 'pest_management';
  title: string;
  advice: string;
  impact: string;
  priority: 'low' | 'medium' | 'high';
}

export interface CropAdvisory {
  userId: string;
  recommendations: CropRecommendation[];
  generatedAt: string;
  context: {
    weatherSummary: string;
    marketTrend: string;
    soilHealth: string;
  };
}
