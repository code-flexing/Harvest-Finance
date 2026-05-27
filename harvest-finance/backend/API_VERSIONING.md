# API Versioning Guide - Harvest Finance

## Overview

This guide explains the URI-based API versioning strategy implemented in the Harvest Finance NestJS backend. This ensures **frontend stability during backend updates** by allowing multiple API versions to coexist.

## Table of Contents

1. [Versioning Strategy](#versioning-strategy)
2. [Current Versions](#current-versions)
3. [URL Structure](#url-structure)
4. [Version Detection & Headers](#version-detection--headers)
5. [Deprecation Process](#deprecation-process)
6. [Frontend Integration](#frontend-integration)
7. [Implementation Guide](#implementation-guide)
8. [Troubleshooting](#troubleshooting)

---

## Versioning Strategy

### URI-Based Versioning

All Harvest Finance API endpoints use **URI-based versioning** with the following pattern:

```
/api/v{VERSION}/{resource}/{action}
```

**Example:**
```
POST /api/v1/auth/login
POST /api/v2/auth/login
GET  /api/v1/vaults/my-vaults
```

### Benefits

✅ **Explicit Version in URL** - Clients always know which API version they're calling  
✅ **Backward Compatibility** - Old versions can be maintained while new ones are developed  
✅ **Easy Monitoring** - Server logs clearly show which versions are being used  
✅ **Clear Deprecation Path** - Deprecation information is communicated via headers  
✅ **Independent Evolution** - Endpoints can evolve independently across versions

---

## Current Versions

### Supported Versions

| Version | Status | Since | Sunset Date |
|---------|--------|-------|-------------|
| **v1**  | Current | 2024-Q1 | TBD |
| **v2**  | In Development | 2025-Q2 | N/A |

### Version Roadmap

- **v1**: Stable production version with core authentication, vaults, portfolio, and stellar operations
- **v2**: Enhanced with improved error handling, new fields, and optimized responses (future)

---

## URL Structure

### Pattern

```
GET|POST|PUT|DELETE /api/v{VERSION}/{module}/{resource}/{action}
```

### Examples

```bash
# Authentication (v1)
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

# Vaults (v1)
GET    /api/v1/vaults/my-vaults
POST   /api/v1/vaults/{vaultId}/deposit
POST   /api/v1/vaults/{vaultId}/withdraw

# Portfolio (v1)
GET    /api/v1/portfolio/balances

# Stellar (v1)
GET    /api/v1/stellar/accounts/{accountId}/transactions
POST   /api/v1/stellar/escrow/create
```

---

## Version Detection & Headers

### Request Processing

The `VersioningInterceptor` processes every incoming request and:

1. **Extracts Version** from URL: Regex pattern `/api/v(\d+)/`
2. **Validates Support** - Returns `404` if version is not supported
3. **Adds Headers** - Response includes version metadata
4. **Logs Usage** - All versioned requests are logged for monitoring

### Response Headers

Every API response includes version information:

```http
HTTP/1.1 200 OK
X-API-Version: v1
Content-Type: application/json

{
  "data": { ... }
}
```

### Deprecation Headers

When calling a deprecated version, additional headers are included:

```http
HTTP/1.1 200 OK
X-API-Version: v1
Deprecation: true
Sunset: Wed, 31 Dec 2025 23:59:59 GMT
Warning: 299 - "API version v1 is deprecated. Migrate to v2 or later. Sunset date: 2025-12-31"
```

---

## Deprecation Process

### Deprecation Timeline

1. **Release New Version** - Ship v{N+1} alongside v{N}
2. **Announce Deprecation** - Update API docs, notify clients via email/banner
3. **Deprecation Period** - Minimum 6-12 months for v{N} to reach sunset
4. **Sunset** - v{N} stops accepting requests (60-90 days after deprecation period)
5. **Removal** - Delete v{N} code from repository

### Example: Deprecating v1

```typescript
// In versioning.config.ts
export const VERSIONING_CONFIG: ApiVersionConfig = {
  current: ApiVersionEnum.V2,
  supported: [ApiVersionEnum.V1, ApiVersionEnum.V2],
  deprecated: new Map([
    [ApiVersionEnum.V1, new Date('2025-12-31')],
  ]),
  // ...
};
```

### Deprecation Communication

When v1 clients make requests:

1. Server responds normally (200 OK)
2. Includes `Deprecation: true` header
3. Includes `Sunset: {date}` header
4. Includes migration warning in `Warning` header
5. Frontend should display notification to users

---

## Frontend Integration

### Best Practices

#### 1. **Use Environment-Based API Versions**

```typescript
// frontend/.env.development
REACT_APP_API_VERSION=v1

// frontend/.env.production
REACT_APP_API_VERSION=v1

// later when deploying v2 support:
// frontend/.env.production
REACT_APP_API_VERSION=v2
```

#### 2. **Centralized API Client Configuration**

```typescript
// frontend/src/api/client.ts
import axios from 'axios';

const API_VERSION = process.env.REACT_APP_API_VERSION || 'v1';
const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/${API_VERSION}`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${getToken()}`,
  },
});

export const getVersionInfo = async () => {
  const response = await apiClient.get('/version-info');
  return response.data;
};
```

#### 3. **Handle Deprecation Warnings**

```typescript
// frontend/src/utils/deprecation-handler.ts
export function checkAndHandleApiDeprecation(response: AxiosResponse) {
  if (response.headers['deprecation'] === 'true') {
    const sunsetDate = response.headers['sunset'];
    const warning = response.headers['warning'];
    
    console.warn('API Deprecation Notice:', warning);
    
    // Show banner to user
    showDeprecationBanner({
      message: `This version of the API will be discontinued on ${sunsetDate}`,
      link: '/api/migration',
    });
  }
}

// In your axios default response handler
apiClient.interceptors.response.use(
  (response) => {
    checkAndHandleApiDeprecation(response);
    return response;
  },
  (error) => Promise.reject(error),
);
```

#### 4. **Support Version Migration**

```typescript
// frontend/src/services/auth.service.ts
import { apiClient } from './api/client';

export async function migrateBetweenVersions() {
  const currentVersion = localStorage.getItem('apiVersion');
  const latestVersion = await getLatestVersion();
  
  if (currentVersion !== latestVersion) {
    console.log(`Migrating from ${currentVersion} to ${latestVersion}`);
    
    // Update local storage
    localStorage.setItem('apiVersion', latestVersion);
    
    // Reinitialize API client
    reinitializeApiClient(latestVersion);
    
    // Refresh user session
    await apiClient.post('/auth/refresh');
  }
}
```

---

## Implementation Guide

### Adding Versioning to a New Controller

#### Step 1: Import Required Utilities

```typescript
// your.controller.ts
import { Controller } from '@nestjs/common';
import { ApiVersions } from '../common/decorators/api-versions.decorator';
import { ApiTags } from '@nestjs/swagger';
```

#### Step 2: Add Decorators

```typescript
@ApiTags('My Module')
@ApiVersions('1', '2')  // Supports both v1 and v2
@Controller('api/v1/my-resource')
export class MyResourceController {
  // ... implementation
}
```

#### Step 3: Current Routes Work for All Supported Versions

```bash
# Automatically routes to the same controller for both versions:
GET /api/v1/my-resource/{id}    →  MyResourceController.getOne()
GET /api/v2/my-resource/{id}    →  MyResourceController.getOne()
```

### Version-Specific Implementations

#### Option A: Dynamic Logic (Recommended)

```typescript
import { Param, Inject } from '@nestjs/common';
import { VersionService } from '../common/services/version.service';

export class MyResourceController {
  constructor(
    private myService: MyService,
    private versionService: VersionService,
  ) {}

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const currentVersion = this.versionService.getCurrentVersion();
    
    if (currentVersion === '2') {
      // Return v2 response format with new fields
      return await this.myService.getOneV2(id);
    } else {
      // Return v1 response format
      return await this.myService.getOneV1(id);
    }
  }
}
```

#### Option B: Separate Controllers (v2 Required)

```typescript
// v1 controller (existing)
@Controller('api/v1/my-resource')
export class MyResourceControllerV1 { }

// v2 controller (new)
@Controller('api/v2/my-resource')
export class MyResourceControllerV2 { }

// Register both in module
@Module({
  controllers: [MyResourceControllerV1, MyResourceControllerV2],
})
export class MyResourceModule { }
```

---

## API Monitoring

### Version Usage Metrics

The versioning system logs all versioned requests. Monitor these metrics:

```bash
# Log queries to find version distribution:
# Development
curl http://localhost:5000/api/v1/health
curl http://localhost:5000/api/v2/health

# Production (via logs)
# Look for: "Versioned request: /api/vX..."
# Count version usage over time
```

### Response Headers Verification

```bash
# Test v1 endpoint
curl -i POST http://localhost:5000/api/v1/auth/login

# You should see:
# X-API-Version: v1
```

### Handling Unsupported Versions

```bash
# Test unsupported version v99
curl -i http://localhost:5000/api/v99/auth/login

# Response:
# HTTP/1.1 404 Not Found
# {
#   "statusCode": 404,
#   "message": "API version v99 is not supported",
#   "supportedVersions": ["1", "2"]
# }
```

---

## Troubleshooting

### Issue: "API version not supported" (404)

**Cause:** Client is calling an unsupported version

**Solution:** 
1. Check `supportedVersions` in response
2. Update frontend to use latest supported version
3. Update `.env` file

```typescript
// Check current supported versions
VersionService.getSupportedVersions()  // Returns: ['1', '2']
```

### Issue: Frontend Still Using Old API After Deployment

**Cause:** Frontend is cached with old API endpoint

**Solution:**
```typescript
// frontend/src/utils/cache-buster.ts
export function getBustUrl(url: string) {
  const timestamp = new Date().getTime();
  return `${url}?cb=${timestamp}`;
}

// Use in API calls
const response = await fetch(getBustUrl(apiUrl));
```

### Issue: Version Migration Failing

**Cause:** Session mismatch between old and new version

**Solution:**
```typescript
// Global response interceptor - clear cache on version change
apiClient.interceptors.response.use(
  (response) => {
    const version = response.headers['x-api-version'];
    const stored = sessionStorage.getItem('apiVersion');
    
    if (stored && stored !== version) {
      // Version mismatch - clear session and redirect to login
      sessionStorage.clear();
      window.location.href = '/login';
    }
    
    sessionStorage.setItem('apiVersion', version);
    return response;
  },
);
```

### Issue: Old Clients Failing After Version Sunset

**Cause:** Old version no longer supported

**Solution:** Pre-emptively migrate before sunset date

```typescript
// frontend/src/services/version-check.ts
export async function checkAndMigrateBeforeSunset() {
  const versionInfo = await getVersionInfo();
  
  Object.entries(versionInfo.deprecation).forEach(([version, info]) => {
    if (info.isDeprecated && info.deprecationDate) {
      const sunsetDate = new Date(info.deprecationDate);
      const daysUntilSunset = Math.floor(
        (sunsetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilSunset <= 30) {
        // 30 days or less until sunset - migrate NOW
        migrateBetweenVersions();
      }
    }
  });
}

// Call on app initialization
useEffect(() => {
  checkAndMigrateBeforeSunset();
}, []);
```

---

## Configuration & Customization

### Modifying Versioning Configuration

Edit: `src/common/config/versioning.config.ts`

```typescript
export const VERSIONING_CONFIG: ApiVersionConfig = {
  // Update current default version
  current: ApiVersionEnum.V2,
  
  // Add/remove supported versions
  supported: [ApiVersionEnum.V1, ApiVersionEnum.V2, ApiVersionEnum.V3],
  
  // Set deprecation dates (null = no sunset date)
  deprecated: new Map([
    [ApiVersionEnum.V0, new Date('2025-06-30')],
    [ApiVersionEnum.V1, new Date('2026-12-31')],
  ]),
  
  // Change URL prefix (default: 'api')
  versionPrefix: 'api',
};
```

### Adding Version-Specific DTOs

```typescript
// src/auth/dto/login-v1.dto.ts
export class LoginDtoV1 {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

// src/auth/dto/login-v2.dto.ts
export class LoginDtoV2 {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;  // New in v2

  @IsString()
  @IsOptional()
  deviceId?: string;     // New in v2
}
```

---

## Summary

| Aspect | Details |
|--------|---------|
| **Format** | `/api/v{VERSION}/{resource}` |
| **Current Version** | v1 |
| **Supported Versions** | v1, v2 |
| **Deprecation Warning** | Via `Deprecation`, `Sunset`, and `Warning` headers |
| **Where to Configure** | `src/common/config/versioning.config.ts` |
| **Frontend Integration** | Use `.env` for API version, handle deprecation headers |
| **Monitoring** | Check request logs for version distribution |
| **Best Practice** | Always use environment-based configuration |

---

## References

- [NestJS Versioning Guide](https://docs.nestjs.com/techniques/versioning)
- [API Versioning Best Practices](https://restfulapi.net/versioning/)
- [HTTP Sunset Header (RFC 8594)](https://tools.ietf.org/html/rfc8594)
- [Deprecation Header (RFC 8594)](https://tools.ietf.org/html/rfc8594)

---

## Contact & Support

For questions about API versioning:
- **Documentation:** https://docs.harvest.finance/api
- **Email:** dev@harvest.finance
- **GitHub Issues:** https://github.com/code-flexing/Harvest-Finance/issues

