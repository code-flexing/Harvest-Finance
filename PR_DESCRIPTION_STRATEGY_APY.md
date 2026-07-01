# Pull Request: Strategy and Vault APY History Implementation

## Direct PR Creation Link

**Click this link to create your Pull Request:**

### https://github.com/daveedAJ/Harvest-Finance/pull/new/feat/strategy-apy-clean

---

## PR Title

```
feat: add Strategy and VaultApyHistory entities with migration
```

## PR Description

```markdown
## Summary

This PR implements Strategy and Vault APY History entities to support compounding frequency configuration and APY tracking for vaults in the Harvest Finance platform.

## Features

- ✅ Strategy entity with compounding frequency support (daily, weekly, monthly)
- ✅ VaultApyHistory entity for tracking APY snapshots over time
- ✅ Database migration for schema changes
- ✅ APY calculation based on compounding frequency
- ✅ Updated VaultResponseDto to include APY field
- ✅ Comprehensive test coverage for APY calculations

## Changes

### New Entities
- `Strategy` - Defines compounding strategies with frequency options
- `VaultApyHistory` - Tracks historical APY data for vaults

### Database
- Migration `1700000000017-CreateStrategyAndApyHistory` creates:
  - `strategies` table with compounding_frequency enum
  - `vault_apy_history` table for APY snapshots
  - Foreign key relationship from vaults to strategies

### Service Updates
- `VaultsService.calculateApy()` - Computes APY from APR using compound interest formula
- `VaultsService.getVaultCompoundingFrequency()` - Gets effective compounding frequency

### DTO Updates
- `VaultResponseDto` - Added `apr` and `apy` fields for API responses

## APY Calculation Formula

```
APY = (1 + APR / n)^n - 1

Where:
- APR = Annual Percentage Rate (as percentage)
- n = Compounding frequency (365 for daily, 52 for weekly, 12 for monthly)
```

## How to Test

```bash
# Run tests
npm test -- harvest-finance/backend/src/vaults/vaults.service.spec.ts

# Build to verify no compilation errors
npm run build -- harvest-finance/backend
```

## Files Changed

- `src/database/entities/strategy.entity.ts` (41 lines) - New Strategy entity
- `src/database/entities/vault-apy-history.entity.ts` (35 lines) - New VaultApyHistory entity
- `src/database/migrations/1700000000017-CreateStrategyAndApyHistory.ts` (173 lines) - New migration
- `src/database/entities/vault.entity.ts` (21 lines) - Added strategy relationship and APY getter
- `src/database/entities/index.ts` (2 lines) - Export new entities
- `src/database/data-source.ts` (4 lines) - Register new entities
- `src/app.module.ts` (6 lines) - Import Strategy and VaultApyHistory modules
- `src/vaults/vaults.module.ts` (11 lines) - Add Strategy and VaultApyHistory repositories
- `src/vaults/vaults.service.ts` (104 lines) - Add APY calculation methods
- `src/vaults/vaults.service.spec.ts` (207 lines) - Add APY tests
- `src/vaults/dto/vault-response.dto.ts` (14 lines) - Add APR and APY fields

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
2. **Review the changes** - All Strategy and APY History implementation
3. **Click "Create pull request"** - Green button on the right
4. **Add PR description** - Use the template above

## Branch Information

- **Branch**: `feat/strategy-apy-clean`
- **Target**: `main`
- **Repository**: https://github.com/daveedAJ/Harvest-Finance