# API Versioning Guide

This document is the authoritative reference for how Harvest Finance versions its REST API. Every contributor adding or modifying endpoints **must** read this guide before opening a pull request.

---

## Table of Contents

1. [Strategy Overview](#1-strategy-overview)
2. [URI Versioning — The Single Source of Truth](#2-uri-versioning--the-single-source-of-truth)
3. [Why Not Header Versioning?](#3-why-not-header-versioning)
4. [Version Lifecycle](#4-version-lifecycle)
5. [Response Headers](#5-response-headers)
6. [Adding a New Versioned Endpoint](#6-adding-a-new-versioned-endpoint)
7. [Adding a New API Version (v2, v3 …)](#7-adding-a-new-api-version-v2-v3-)
8. [Deprecating an Endpoint or Version](#8-deprecating-an-endpoint-or-version)
9. [Available Decorators](#9-available-decorators)
10. [Version Discovery Endpoint](#10-version-discovery-endpoint)
11. [Configuration Reference](#11-configuration-reference)
12. [Common Mistakes](#12-common-mistakes)

---

## 1. Strategy Overview

Harvest Finance uses **URI-based versioning** exclusively. The version is encoded directly in the URL path:

```
/api/v{N}/{resource}
```

| Aspect | Decision |
|--------|----------|
| **Strategy** | URI versioning (`/api/v1/…`) |
| **Header versioning** | ❌ Not used |
| **Query-param versioning** | ❌ Not used |
| **Current stable version** | `v1` |
| **NestJS versioning type** | `VersioningType.URI` (configured in `main.ts`) |
| **Config file** | `backend/src/common/config/versioning.config.ts` |

---

## 2. URI Versioning — The Single Source of Truth

### URL structure

```
https://<host>/api/v<N>/<resource>[/<id>][?query]
```

### Real examples

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/v1/vaults` | List all vaults |
| `POST` | `/api/v1/vaults/:id/deposit` | Deposit into a vault |
| `GET` | `/api/v1/users` | List users (admin) |
| `GET` | `/api/v1/marketplace` | Browse co-op marketplace |
| `GET` | `/api/version-info` | Discover supported versions (unversioned) |

> **Note:** The version discovery endpoint (`/api/version-info`) is intentionally **unversioned**. It exists to let clients programmatically detect which versions the server supports before choosing one.

### How NestJS resolves the version

NestJS reads the version segment from the URL path and matches it against the `version` field declared in the `@Controller()` decorator. The `VersioningInterceptor` then validates the extracted version against `VERSIONING_CONFIG.supported` and rejects unsupported versions with `404`.

---

## 3. Why Not Header Versioning?

Header versioning (e.g., `Accept: application/vnd.harvest.v2+json`) is **not used** in this project. The decision was deliberate:

- **Cacheability** — CDNs and HTTP caches key on the URL by default. URI versions are cache-friendly without extra `Vary` headers.
- **Visibility** — The version is immediately obvious in browser dev-tools, logs, and curl commands, making debugging faster.
- **Simplicity** — No custom `Accept` header parsing; the version falls out of standard Express/NestJS routing.
- **Contributor clarity** — New endpoints do not need to decide which header format to parse; the pattern is always the same.

If you see code that routes on a custom `X-API-Version` *request* header, that is a bug — please open an issue.

---

## 4. Version Lifecycle

```
Planned → Active → Deprecated → Sunset (removed)
```

| State | Meaning | Client behaviour |
|-------|---------|-----------------|
| **Active** | Fully supported, no warnings | Normal |
| **Deprecated** | Still works, but removal date is set | `Deprecation: true` + `Sunset` + `Warning` headers are added |
| **Sunset** | Removed from `supported[]` in config | Server returns `404` with a list of supported versions |

The deprecation schedule is maintained in `VERSIONING_CONFIG.deprecated` inside `versioning.config.ts`. See [§11](#11-configuration-reference) for the full shape.

---

## 5. Response Headers

Every versioned request receives the following response headers:

### Always present (for versioned routes)

| Header | Example value | Purpose |
|--------|--------------|---------|
| `X-API-Version` | `v1` | Echo of the version that served this request |

### Present only on deprecated versions

| Header | Example value | Purpose |
|--------|--------------|---------|
| `Deprecation` | `true` | RFC 8594 deprecation flag |
| `Sunset` | `Thu, 31 Dec 2026 00:00:00 GMT` | Removal date (RFC 8594) |
| `Warning` | `299 - "API v1 deprecated. Migrate to v2. Sunset: 2026-12-31"` | Human-readable warning |

### Unsupported version (error response)

```jsonc
// HTTP 404
{
  "statusCode": 404,
  "message": "API version v0 is not supported",
  "supportedVersions": ["1"]
}
```

---

## 6. Adding a New Versioned Endpoint

Follow these four steps every time you create a new controller or add routes to an existing one.

### Step 1 — Declare the version in `@Controller()`

```typescript
// src/orders/orders.controller.ts
import { Controller } from '@nestjs/common';

@Controller({
  path: 'orders',
  version: '1',          // ← always a string, matches ApiVersionEnum.V1
})
export class OrdersController { /* … */ }
```

Do **not** use `@Controller('orders')` without a `version` key. Routes without a version will not be prefixed by NestJS's URI versioning middleware and will fall through as `/api/orders` instead of `/api/v1/orders`.

### Step 2 — Apply the `@ApiVersions` decorator (documentation metadata)

```typescript
import { ApiVersions } from '../common/decorators/api-versions.decorator';

@Controller({ path: 'orders', version: '1' })
@ApiVersions('1')                 // ← lists every version this controller supports
export class OrdersController { /* … */ }
```

This decorator attaches metadata used by tooling and future guard implementations. It is separate from NestJS's own version routing.

### Step 3 — Use `getVersionedRoute()` for any hardcoded URL references

If you need to reference a route URL in code (e.g., redirect targets, Swagger `@ApiResponse` examples), use the helper rather than string-concatenating manually:

```typescript
import { getVersionedRoute, ApiVersionEnum } from '../common/config/versioning.config';

const path = getVersionedRoute(ApiVersionEnum.V1, 'orders');
// → 'api/v1/orders'
```

### Step 4 — Update `docs/api/README.md`

Add your new endpoint(s) to the relevant section in `docs/api/README.md` with a request/response example so the next contributor knows what the endpoint does.

### Complete example

```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiVersions } from '../common/decorators/api-versions.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('orders')
@Controller({ path: 'orders', version: '1' })
@ApiVersions('1')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all orders' })
  findAll() {
    return this.ordersService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }
}
```

The resulting routes will be:

```
GET  /api/v1/orders
POST /api/v1/orders
```

---

## 7. Adding a New API Version (v2, v3 …)

When a breaking change is required (changed response shape, removed field, new required field), introduce a new version rather than modifying the existing one.

### Step 1 — Add the new version to `ApiVersionEnum`

```typescript
// src/common/config/versioning.config.ts
export enum ApiVersionEnum {
  V1 = '1',
  V2 = '2',   // ← add here
}
```

### Step 2 — Add it to `VERSIONING_CONFIG.supported`

```typescript
export const VERSIONING_CONFIG: ApiVersionConfig = {
  current: ApiVersionEnum.V2,           // bump current
  supported: [ApiVersionEnum.V1, ApiVersionEnum.V2],  // keep old versions alive
  deprecated: new Map([
    [ApiVersionEnum.V1, new Date('2027-06-30')],      // set a sunset date for v1
  ]),
  versionPrefix: 'api',
};
```

### Step 3 — Create a v2 controller (do not modify the v1 controller)

```typescript
// src/orders/orders-v2.controller.ts
@Controller({ path: 'orders', version: '2' })
@ApiVersions('2')
export class OrdersV2Controller {
  // Only the changed behaviour lives here.
  // Unchanged endpoints can delegate to the same service methods.
}
```

Keeping v1 and v2 controllers separate prevents accidental breakage of clients still on v1.

### Step 4 — Register the new controller in its module

```typescript
// src/orders/orders.module.ts
@Module({
  controllers: [OrdersController, OrdersV2Controller],
  // …
})
export class OrdersModule {}
```

### Step 5 — Update documentation

- `docs/api/versioning.md` (this file) — update the "Current stable version" row in §1
- `docs/api/README.md` — add the new endpoints
- `CHANGELOG.md` or release notes — describe what changed and why

---

## 8. Deprecating an Endpoint or Version

### Deprecating a whole version

Set a sunset date in `VERSIONING_CONFIG.deprecated`. The `VersioningInterceptor` automatically appends the RFC 8594 headers on every response for that version from that moment on.

```typescript
deprecated: new Map([
  [ApiVersionEnum.V1, new Date('2027-06-30')],
]),
```

> **Policy:** Give clients at least **6 months** of deprecation notice before sunset.

### Deprecating a single endpoint within a version

Use the `@DeprecatedInVersion` decorator:

```typescript
import { DeprecatedInVersion } from '../common/decorators/api-versions.decorator';

@Get('legacy-stats')
@DeprecatedInVersion('1', new Date('2027-06-30'))
getLegacyStats() { /* … */ }
```

Also add a comment in `docs/api/README.md` marking the endpoint as deprecated with the expected removal date.

---

## 9. Available Decorators

All decorators live in `src/common/decorators/api-versions.decorator.ts`.

| Decorator | Signature | Purpose |
|-----------|-----------|---------|
| `@ApiVersions` | `(...versions: string[])` | Metadata: which versions this controller/method handles |
| `@MinApiVersion` | `(version: string)` | Metadata: minimum version required to call this method |
| `@DeprecatedInVersion` | `(version: string, sunsetDate?: Date)` | Metadata: marks a method/controller as deprecated |

These decorators attach metadata via `SetMetadata`. They do **not** affect routing — routing is determined by the `version` key in `@Controller()`.

---

## 10. Version Discovery Endpoint

Clients can dynamically discover the server's version status without hardcoding it.

### `GET /api/version-info`

```jsonc
// 200 OK
{
  "currentVersion": "1",
  "supported": ["1"],
  "deprecation": {
    "v1": {
      "isDeprecated": false,
      "deprecationDate": null,
      "isSupported": true,
      "isCurrent": true
    }
  }
}
```

### `GET /api/version-info/migrate/:fromVersion`

Returns a human-readable migration guide when a client is on a deprecated version.

```jsonc
// GET /api/version-info/migrate/1
// 200 OK (if v1 were deprecated)
{
  "message": "Version v1 is deprecated and will be sunset on 6/30/2027. Please migrate to v2 as soon as possible. See migration guide at: https://docs.harvest.finance/api/migration",
  "migrateToVersion": "2",
  "documentation": "https://docs.harvest.finance/api/migration"
}
```

### `GET /api/version-info/health`

```jsonc
// 200 OK
{
  "status": "ok",
  "timestamp": "2026-05-27T10:00:00.000Z",
  "currentVersion": "1"
}
```

---

## 11. Configuration Reference

**File:** `backend/src/common/config/versioning.config.ts`

```typescript
export enum ApiVersionEnum {
  V1 = '1',
  // Add new versions here following the existing pattern
}

export interface ApiVersionConfig {
  current: ApiVersionEnum;            // The recommended version for new clients
  supported: ApiVersionEnum[];        // All versions the server will respond to
  deprecated: Map<ApiVersionEnum, Date | null>; // Versions past their prime; Date = sunset
  versionPrefix: string;              // 'api' → produces /api/v1/…
}

export const VERSIONING_CONFIG: ApiVersionConfig = {
  current: ApiVersionEnum.V1,
  supported: [ApiVersionEnum.V1],
  deprecated: new Map([
    // [ApiVersionEnum.V0, new Date('2025-12-31')],
  ]),
  versionPrefix: 'api',
};
```

### Helper functions exported from `versioning.config.ts`

| Function | Signature | Returns |
|----------|-----------|---------|
| `getVersionDeprecationInfo` | `(version: ApiVersionEnum)` | `{ isDeprecated, deprecationDate, isSupported, isCurrent }` |
| `getSupportedVersions` | `()` | `string[]` |
| `isVersionSupported` | `(version: string)` | `boolean` |
| `getVersionedRoute` | `(version, route)` | `string` — e.g. `api/v1/orders` |

---

## 12. Common Mistakes

| Mistake | Why it's wrong | Fix |
|---------|---------------|-----|
| `@Controller('orders')` without `version` | Route resolves as `/api/orders` — not versioned, bypasses the interceptor | `@Controller({ path: 'orders', version: '1' })` |
| Hardcoding `/api/v1/` as a string | Breaks silently when the version changes | Use `getVersionedRoute(ApiVersionEnum.V1, 'orders')` |
| Modifying a v1 controller to add a breaking change | Breaks every existing v1 client | Create a new `v2` controller instead |
| Removing a version from `supported[]` without a deprecation period | Clients get an unexpected `404` | Add to `deprecated` map first, wait 6+ months, then remove from `supported` |
| Using `Accept` / `X-API-Version` request headers to select a version | Not the chosen strategy; the interceptor ignores request headers for version selection | Embed the version in the URL path |

---

*Last updated: May 2026 — maintainers: see [CONTRIBUTING.md](../../CONTRIBUTING.md)*