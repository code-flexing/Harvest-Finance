# API Rate Limits

Harvest Finance implements rate limiting to protect the API from abuse, brute-force attacks, and general performance degradation. This document outlines the default rate limits and specific endpoints that have customized thresholds.

## Global Rate Limit Configurations

The global rate limiting parameters are defined in `src/common/config/throttler.config.ts`. They provide baseline protection using three tiers: `short`, `medium`, and `long`. 

| Configuration Name | Default Limit | Default TTL (Time-To-Live) | Environment Variable Override |
|--------------------|---------------|----------------------------|-------------------------------|
| **short**          | 5 requests    | 1,000 ms (1 second)        | `THROTTLE_SHORT_LIMIT` / `THROTTLE_SHORT_TTL` |
| **medium**         | 30 requests   | 10,000 ms (10 seconds)     | `THROTTLE_MEDIUM_LIMIT` / `THROTTLE_MEDIUM_TTL` |
| **long**           | 100 requests  | 60,000 ms (1 minute)       | `THROTTLE_LIMIT` / `THROTTLE_TTL` |

*Note: All TTL values are in milliseconds.*

## How to Modify Rate Limits

1. **Global Modificiation**: To change global limits, set the appropriate environment variables in your `.env` file (e.g., `THROTTLE_LIMIT=200`).
2. **Endpoint Modificiation**: Use the `@Throttle` decorator (from `@nestjs/throttler`) or the custom `@RateLimit` decorator on specific controller routes.
   ```typescript
   @Throttle({ default: { limit: 10, ttl: 60000 } })
   @Post('my-endpoint')
   ```

---

## Endpoint-Specific Overrides

Certain endpoints perform sensitive operations (like mutations, authentication, or blockchain integrations) and therefore require much stricter limits than the global `long` defaults. Below is the table of all overridden endpoints.

### Authentication & User Management (`Auth Controller`)
*Located in `src/auth/auth.controller.ts`*

| Endpoint | Method | Limit | Window (TTL) | Reason |
|----------|--------|-------|--------------|--------|
| `/auth/register` | `POST` | 10 | 60 seconds (60000ms) | Prevents spam registration while allowing normal onboarding |
| `/auth/login` | `POST` | 5 | 60 seconds (60000ms) | Defends against brute-force password guessing attacks |
| `/auth/forgot-password` | `POST` | 3 | 1 hour (3600s) | Protects email infrastructure from spam/harassment |
| `/auth/reset-password` | `POST` | 3 | 1 hour (3600s) | Hardens against token brute-force attempts |
| `/auth/stellar/challenge` | `POST` | 10 | 60 seconds (60000ms) | Prevents challenge generation spam while supporting standard flows |
| `/auth/stellar/verify` | `POST` | 5 | 60 seconds (60000ms) | Mitigates replay or brute-force signature attempts |

### Vault Operations (`Vaults Controller`)
*Located in `src/vaults/vaults.controller.ts`*

| Endpoint | Method | Limit | Window (TTL) | Reason |
|----------|--------|-------|--------------|--------|
| `/vaults/deposits/batch` | `POST` | 10 | 60 seconds (60000ms) | High resource consumption (atomic multi-transactions) |
| `/vaults/:vaultId/deposit` | `POST` | 20 | 60 seconds (60000ms) | Requires state validation and database transactions |
| `/vaults/:vaultId/withdraw` | `POST` | 20 | 60 seconds (60000ms) | Involves downstream network calls and blockchain finality checks |
| `/vaults/:vaultId/clone` | `POST` | 10 | 60 seconds (60000ms) | Mitigates excessive creation of Vault resources |
| `/vaults/:vaultId/multi-signature-config` | `POST` | 10 | 60 seconds (60000ms) | Prevents rapid configuration swapping/tampering |
| `/vaults/:vaultId/request-approval` | `POST` | 10 | 60 seconds (60000ms) | Limits notification/approval-request spam to other users |
| `/vaults/:vaultId/approve` | `POST` | 10 | 60 seconds (60000ms) | Hardens against brute-force or rapid state manipulation |
| `/vaults/:vaultId/pause` | `POST` | 10 | 60 seconds (60000ms) | Prevents rapid toggling of Vault operational states |
| `/vaults/:vaultId/resume` | `POST` | 10 | 60 seconds (60000ms) | Prevents rapid toggling of Vault operational states |

### Farm Vault Operations (`Farm Vaults Controller`)
*Located in `src/farm-vaults/farm-vaults.controller.ts`*

| Endpoint | Method | Limit | Window (TTL) | Reason |
|----------|--------|-------|--------------|--------|
| `/farm-vaults` | `POST` | 10 | 60 seconds (60000ms) | Limits rapid vault instantiation which can exhaust database resources |
| `/farm-vaults/:id/deposit` | `POST` | 20 | 60 seconds (60000ms) | Requires validation and accounting updates |
| `/farm-vaults/:id/withdraw` | `POST` | 20 | 60 seconds (60000ms) | Requires validation and accounting updates |
