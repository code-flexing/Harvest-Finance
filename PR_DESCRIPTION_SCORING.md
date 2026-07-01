# Pull Request: Vault Strategy Scoring Model Implementation

## Direct PR Creation Link

**Click this link to create your Pull Request:**

### https://github.com/daveedAJ/Harvest-Finance/pull/new/feat/strategy-apy-clean

---

## PR Title

```
feat: implement vault strategy scoring model with hourly recalculation
```

## PR Description

```markdown
## Summary

This PR implements a comprehensive vault strategy scoring system (GitHub issues #504 and #977) that provides risk-adjusted scores for vaults based on multiple factors.

## Features

- ✅ Strategy score (0-100) for each vault based on weighted components
- ✅ Risk-adjusted APY scoring (40% weight)
- ✅ TVL stability scoring (25% weight)
- ✅ Historical drawdown scoring (20% weight)
- ✅ Operator reputation scoring (15% weight)
- ✅ Hourly score recalculation via cron job
- ✅ Score history persistence in database
- ✅ GET /vaults/:id/score-breakdown API endpoint
- ✅ Comprehensive unit tests

## Changes

### New Files
- `src/analytics/scoring.service.ts` - Scoring service with all calculation logic
- `src/analytics/scoring.service.spec.ts` - Unit tests for scoring service
- `src/vaults/dto/score-breakdown.dto.ts` - DTO for score breakdown response
- `src/database/entities/vault-score-history.entity.ts` - Entity for score history
- `src/database/migrations/1700000000018-CreateVaultScoreHistory.ts` - Migration for score history table
- `docs/scoring-model.md` - Documentation for the scoring model

### Modified Files
- `src/database/entities/vault.entity.ts` - Added strategyScore column
- `src/database/entities/index.ts` - Export VaultScoreHistory entity
- `src/analytics/analytics.module.ts` - Added ScoringService
- `src/vaults/vaults.controller.ts` - Added score-breakdown endpoint
- `src/vaults/vaults.module.ts` - Added AnalyticsModule and VaultScoreHistory
- `src/app.module.ts` - Added VaultScoreHistory entity and migration

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

## How to Test

```bash
# Run tests
npm test -- harvest-finance/backend/src/analytics/scoring.service.spec.ts

# Build to verify no compilation errors
npm run build -- harvest-finance/backend
```

## API Endpoint

### GET /vaults/:vaultId/score-breakdown

Returns the detailed score breakdown for a specific vault:

```json
{
  "strategyScore": 75,
  "apyScore": 75,
  "tvlStabilityScore": 100,
  "drawdownScore": 100,
  "operatorScore": 25
}
```

## Checklist

- [x] Code follows project style guidelines
- [x] No new dependencies added
- [x] New tests included and passing
- [x] Documentation updated
- [x] All acceptance criteria met
```

---

## Quick Steps

1. **Click the link above** - Takes you to GitHub comparison page
2. **Review the changes** - All Strategy Scoring implementation
3. **Click "Create pull request"** - Green button on the right
4. **Add PR description** - Use the template above

## Branch Information

- **Branch**: `feat/strategy-apy-clean`
- **Target**: `main`
- **Repository**: https://github.com/daveedAJ/Harvest-Finance