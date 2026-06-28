# Vault Strategy Scoring Model

## Overview

The strategy scoring system provides a comprehensive 0-100 score for each vault based on multiple risk-adjusted metrics. This score helps users evaluate vault quality and make informed investment decisions.

## Score Components

The overall `strategyScore` is calculated as a weighted average of four components:

| Component | Weight | Description |
|-----------|--------|-------------|
| APY Score | 40% | Risk-adjusted Annual Percentage Yield |
| TVL Stability Score | 25% | Total Value Locked volatility |
| Drawdown Score | 20% | Historical maximum drawdown |
| Operator Score | 15% | Vault operator reputation |

## Component Details

### 1. APY Score (40%)

The APY score evaluates the yield potential of a vault. Higher APY generally indicates better returns, but we cap at reasonable levels to avoid over-optimization.

| APY Range | Score |
|-----------|-------|
| >= 20% | 100 |
| 10% - 20% | 75 |
| 5% - 10% | 50 |
| 0% - 5% | 25 |
| <= 0% | 0 |

### 2. TVL Stability Score (25%)

The TVL stability score measures the volatility of a vault's APY over time. Lower volatility indicates more predictable returns.

The score is calculated using the coefficient of variation (CV = standard deviation / mean):

| CV Range | Score |
|----------|-------|
| <= 5% | 100 (Very stable) |
| 5% - 10% | 75 (Stable) |
| 10% - 20% | 50 (Moderately stable) |
| 20% - 30% | 25 (Unstable) |
| > 30% | 0 (Very unstable) |

### 3. Drawdown Score (20%)

The drawdown score measures the maximum historical decline from peak APY. Lower drawdown indicates better risk management.

| Max Drawdown | Score |
|--------------|-------|
| <= 5% | 100 (Excellent) |
| 5% - 10% | 75 (Good) |
| 10% - 20% | 50 (Fair) |
| 20% - 50% | 25 (Poor) |
| > 50% | 0 (Very poor) |

### 4. Operator Score (15%)

The operator score is based on the vault's age, which serves as a proxy for operator track record and reliability.

| Vault Age | Score |
|-----------|-------|
| >= 365 days | 100 (Proven track record) |
| 180 - 365 days | 75 (Established) |
| 30 - 180 days | 50 (New but operational) |
| < 30 days | 25 (Very new) |

## Score Calculation

The overall strategy score is calculated as:

```
strategyScore = round(
  apyScore * 0.4 +
  tvlStabilityScore * 0.25 +
  drawdownScore * 0.2 +
  operatorScore * 0.15
)
```

## API Endpoints

### GET /vaults/:id/score-breakdown

Returns the detailed score breakdown for a specific vault.

**Response:**
```json
{
  "strategyScore": 75,
  "apyScore": 75,
  "tvlStabilityScore": 100,
  "drawdownScore": 100,
  "operatorScore": 25
}
```

### GET /vaults/:id

The vault response now includes the `strategyScore` field.

## Scheduled Updates

Scores are recalculated hourly via a cron job (`@Cron(CronExpression.EVERY_HOUR)`). Each recalculation:

1. Fetches all active vaults
2. Calculates the score for each vault
3. Updates the vault's `strategyScore` field
4. Saves a snapshot to the `vault_score_history` table

## Score History

The `vault_score_history` table stores historical score snapshots:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| vault_id | UUID | Foreign key to vault |
| strategy_score | int | Overall score |
| apy_score | int | APY component |
| tvl_stability_score | int | TVL stability component |
| drawdown_score | int | Drawdown component |
| operator_score | int | Operator reputation component |
| snapshot_date | date | Date of the snapshot |
| created_at | timestamp | Record creation time |

## Example Score Interpretation

| Score Range | Interpretation |
|-------------|----------------|
| 80-100 | Excellent - High yield, stable, low risk |
| 60-79 | Good - Solid performance with reasonable risk |
| 40-59 | Fair - Moderate yield and risk |
| 20-39 | Poor - Low yield or high risk |
| 0-19 | Very Poor - Avoid or investigate further |

## Implementation Notes

- Scores are calculated based on available historical data
- Vaults with insufficient history receive default scores (50 for TVL stability and drawdown)
- The scoring model is designed to be modular and extensible
- Future enhancements may include additional factors like audit status, community feedback, and protocol security metrics