export interface OperatorReputation {
  operatorId: string;
  operatorName: string;
  overallScore: number;
  components: {
    vaultPerformance: number;
    operatorTenure: number;
    governanceParticipation: number;
    securityIncidents: number;
  };
  vaultHistory: VaultHistoryEntry[];
  scoreHistory: ScoreHistoryPoint[];
}

export interface VaultHistoryEntry {
  vaultId: string;
  vaultName: string;
  asset: string;
  apy: string;
  tvl: string;
  status: 'active' | 'paused' | 'closed';
  startDate: string;
}

export interface ScoreHistoryPoint {
  date: string;
  score: number;
}
