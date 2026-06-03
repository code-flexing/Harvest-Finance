# 📡 API Documentation

Base URL: `http://localhost:5000/api/v1`  
Interactive Swagger UI: `http://localhost:5000/api/docs`

> **Adding a new endpoint?** Read the [API Versioning Guide](versioning.md) first.  
> All routes must follow the URI versioning strategy (`/api/v{N}/resource`).

---

## Authentication

All protected routes require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

### POST /auth/register
Register a new user.
```json
{
  "email": "farmer@example.com",
  "password": "SecurePass123!",
  "role": "FARMER",
  "full_name": "John Doe",
  "phone_number": "+1234567890",
  "stellar_address": "GXXX..."
}
```
**Response:** `{ access_token, refresh_token, user }`

### POST /auth/login
```json
{ "email": "farmer@example.com", "password": "SecurePass123!" }
```
**Response:** `{ access_token, refresh_token, user }`

### POST /auth/refresh
```json
{ "refresh_token": "<token>" }
```
**Response:** `{ access_token }`

### POST /auth/logout
Requires Bearer token. Invalidates current session.

---

## Vaults

### GET /vaults
Returns all public vaults.

### GET /vaults/user/:userId
Returns vaults owned by a user.

### GET /vaults/:id
Returns a single vault by ID.

### POST /vaults/:id/deposit
```json
{ "userId": "uuid", "amount": 500, "idempotencyKey": "optional-key" }
```

### POST /vaults/:id/withdraw
```json
{ "userId": "uuid", "amount": 200 }
```

---

## Analytics

### GET /analytics/vaults
Returns vault-level metrics:
```json
{
  "totalVaults": 10,
  "activeVaults": 8,
  "totalDepositsUsd": 125000,
  "totalWithdrawalsUsd": 30000,
  "avgUtilizationPct": 72.5
}
```

### GET /analytics/system
Returns system-level metrics:
```json
{
  "uptimeSeconds": 3600,
  "totalApiRequests": 1500,
  "totalErrors": 3,
  "errorRate": 0.2,
  "lastUpdatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## State Sync

### GET /state-sync/status
Returns last sync run results and per-vault drift report.

### POST /state-sync/trigger
Manually triggers a state sync run. Returns per-vault reconciliation results.

---

## Soroban Events

### GET /soroban/events
Query indexed on-chain events. Supports filters: `contractId`, `type`, `fromLedger`, `toLedger`.

### GET /soroban/status
Returns indexer status: enabled, last ledger, total events.

---

## Webhooks

External systems push events to these endpoints. Each request must include an HMAC-SHA256 signature of the **raw JSON body** in the `x-webhook-signature` header (`sha256=<hex>`).

### POST /webhooks/payments
Payment provider confirmation (requires `WEBHOOK_PAYMENTS_HMAC_SECRET` on the server).

```json
{
  "eventId": "evt_unique_123",
  "eventType": "payment.confirmed",
  "depositId": "uuid",
  "transactionHash": "abc123",
  "stellarTransactionId": "optional-stellar-tx-id",
  "occurredAt": "2026-06-02T10:00:00.000Z"
}
```

`eventType` may also be `payment.failed`.

**Response:** `{ "accepted": true, "eventId": "...", "duplicate": false }`

### POST /webhooks/chain-events
Chain indexer event ingestion (requires `WEBHOOK_CHAIN_EVENTS_HMAC_SECRET` on the server).

```json
{
  "eventId": "chain_evt_123",
  "type": "contract",
  "contractId": "CABC...",
  "ledger": 12345,
  "ledgerClosedAt": "2026-06-02T10:00:00.000Z",
  "transactionHash": "tx_hash",
  "pagingToken": "paging_token",
  "topics": [],
  "value": {}
}
```

---

## Health

### GET /health
Returns service health status (DB, Redis connectivity).