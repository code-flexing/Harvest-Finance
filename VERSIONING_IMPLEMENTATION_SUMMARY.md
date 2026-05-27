# API Versioning Implementation Summary

## Overview

URI-based API versioning has been successfully implemented in the Harvest Finance backend to ensure **frontend stability during backend updates**. This allows the frontend to continue working even when new API versions are released.

## What Was Implemented

### ✅ Backend Infrastructure

#### 1. **Versioning Configuration** (`src/common/config/versioning.config.ts`)
- Central configuration for API versions
- Version enumeration (V1, V2, etc.)
- Deprecation schedule management
- Helper functions for version checking and routing

#### 2. **Versioning Interceptor** (`src/common/interceptors/versioning.interceptor.ts`)
- Automatically extracts version from URL pattern: `/api/v{X}/...`
- Validates requested version against supported versions
- Adds version headers to responses
- Handles deprecation warnings and sunset dates
- Logs all versioned requests for monitoring

#### 3. **Version Service** (`src/common/services/version.service.ts`)
- Injectable service for version management
- Methods: `getCurrentVersion()`, `getSupportedVersions()`, `isVersionSupported()`, etc.
- Provides version info for API documentation
- Generates migration guides for deprecated versions
- Returns proper response headers

#### 4. **Version Info Controller** (`src/common/controllers/version-info.controller.ts`)
- Public endpoint: `GET /api/version-info` — Get version information
- Public endpoint: `GET /api/version-info/migrate/{version}` — Get migration guide
- Public endpoint: `GET /api/version-info/health` — Health check with version info
- Available without authentication

#### 5. **Common Module** (`src/common/common.module.ts`)
- Exports VersionService and VersionInfoController
- Makes versioning globally available

#### 6. **API Versions Decorator** (`src/common/decorators/api-versions.decorator.ts`)
- `@ApiVersions('1', '2')` — Mark supported versions
- `@MinApiVersion('2')` — Set minimum required version
- `@DeprecatedInVersion('1')` — Mark endpoint as deprecated

#### 7. **Updated Main Bootstrap** (`src/main.ts`)
- Registers VersioningInterceptor globally
- Version checking happens on every request

#### 8. **Updated Controllers**
- `AuthController` — Added `@ApiVersions('1', '2')` decorator
- `VaultsController` — Added `@ApiVersions('1', '2')` decorator
- Pattern: existing routes now support multiple versions through the interceptor

### ✅ Documentation

#### 1. **Backend Versioning Guide** (`API_VERSIONING.md`)
- Complete overview of versioning strategy
- Current version roadmap
- URL structure and patterns
- Request/response headers
- Deprecation process (6-12 month timeline)
- Implementation guide for developers
- Monitoring and troubleshooting

#### 2. **Frontend Integration Guide** (`harvest-finance/frontend/FRONTEND_VERSIONING_GUIDE.md`)
- Environment configuration examples
- Centralized API client setup with Axios
- Service layer architecture
- Version checking hooks
- Deprecation banner component
- Response handler for version-specific logic
- Testing examples
- Migration guide for version upgrades
- Best practices and troubleshooting

## How It Works

### Request Flow

```
Client Request
    ↓
GET /api/v1/auth/login
    ↓
VersioningInterceptor
    ├─ Extract version from URL (v1)
    ├─ Validate version is supported
    ├─ Log versioned request
    └─ Pass to handler
    ↓
AuthController.login()
    ↓
Response with headers:
    X-API-Version: v1
    [+ Deprecation headers if applicable]
```

### Version URL Patterns

```
# All supported — same controller handles multiple versions
GET  /api/v1/auth/login          →  AuthController
GET  /api/v2/auth/login          →  AuthController  (routes to same handler)

GET  /api/v1/vaults/my-vaults    →  VaultsController
GET  /api/v2/vaults/my-vaults    →  VaultsController

# Unsupported — returns 404
GET  /api/v99/auth/login         →  404 Not Found
     {
       "statusCode": 404,
       "message": "API version v99 is not supported",
       "supportedVersions": ["1", "2"]
     }
```

## Current State

| Aspect | Status |
|--------|--------|
| **Supported Versions** | v1 (current), v2 (development) |
| **Version Interceptor** | ✅ Active globally |
| **Version Service** | ✅ Available globally |
| **Version Info Endpoint** | ✅ Available at `/api/version-info` |
| **Configuration** | ✅ Centralized in `versioning.config.ts` |
| **Documentation** | ✅ Complete for backend and frontend |
| **Decorators** | ✅ Added to AuthController, VaultsController |

## Key Features

### 1. **Transparent Version Support**
- Existing controllers automatically support multiple versions
- No need to duplicate code for each version
- URLs remain clean: `/api/v1/resource` and `/api/v2/resource` hit same endpoint

### 2. **Version Information in Headers**
```http
X-API-Version: v1
Deprecation: true (if deprecated)
Sunset: Wed, 31 Dec 2025 23:59:59 GMT (if deprecated)
Warning: 299 - "API version v1 is deprecated..." (if deprecated)
```

### 3. **Dynamic Version Logic**
```typescript
export class MyController {
  constructor(private versionService: VersionService) {}

  async getOne(@Param('id') id: string) {
    const version = this.versionService.getCurrentVersion();
    
    if (version === '2') {
      return this.service.getOneV2(id); // New format
    }
    return this.service.getOneV1(id);   // Legacy format
  }
}
```

### 4. **Frontend Version Configuration**
```bash
# .env
REACT_APP_API_VERSION=v1
REACT_APP_API_URL=https://api.harvest.finance
```

### 5. **Version Discovery**
Frontend can query version information:
```bash
curl https://api.harvest.finance/api/version-info
# Response:
# {
#   "currentVersion": "1",
#   "supported": ["1", "2"],
#   "deprecation": { ... }
# }
```

## Configuration

To add a new version or change deprecation dates, edit:

**File:** `src/common/config/versioning.config.ts`

```typescript
export const VERSIONING_CONFIG: ApiVersionConfig = {
  current: ApiVersionEnum.V1,           // Current default version
  supported: [ApiVersionEnum.V1, ApiVersionEnum.V2],  // All supported versions
  deprecated: new Map([
    // [ApiVersionEnum.V1, new Date('2025-12-31')],  // Uncomment to deprecate v1
  ]),
  versionPrefix: 'api',
};
```

## Adding Versioning to New Controllers

```typescript
import { ApiVersions } from '../common/decorators/api-versions.decorator';

@ApiTags('My Module')
@ApiVersions('1', '2')  // Supports v1 and v2
@Controller('api/v1/my-resource')
export class MyResourceController {
  // Your implementation
  // Both /api/v1/my-resource and /api/v2/my-resource will route here
}
```

## Frontend Integration Steps

1. **Set Environment Variable**
   ```bash
   REACT_APP_API_VERSION=v1
   ```

2. **Create Centralized API Client**
   ```typescript
   const API_VERSION = process.env.REACT_APP_API_VERSION || 'v1';
   const BASE_URL = `${process.env.REACT_APP_API_URL}/api/${API_VERSION}`;
   export const apiClient = axios.create({ baseURL: BASE_URL });
   ```

3. **Add Deprecation Handling**
   ```typescript
   apiClient.interceptors.response.use((response) => {
     if (response.headers['deprecation'] === 'true') {
       showDeprecationBanner(response.headers['warning']);
     }
     return response;
   });
   ```

4. **Check Version on App Load**
   ```typescript
   useEffect(() => {
     const versionInfo = await fetch('/api/version-info');
     console.log('Supported versions:', versionInfo.supported);
   }, []);
   ```

## Monitoring & Analytics

### Log Queries
Monitor version usage by searching logs:
```bash
# Development
tail -f logs/app.log | grep "Versioned request"

# Production (via Cloud Logging)
# Filter by pattern: "Versioned request"
```

### Metrics to Track
- Version distribution (% of requests per version)
- Deprecation banner impressions
- Migration rate after announcing deprecation
- Error rate per version

## Deprecation Timeline

When deprecating a version:

1. **Month 1:** Announce deprecation in docs and via banner
2. **Month 2-6:** Deprecation period (clients migrate)
3. **Month 7:** Final warnings, send emails
4. **Month 8-9:** Stop accepting requests (return 404)
5. **Month 9+:** Remove code from repository

## Testing Version Routing

```bash
# Test v1
curl -i http://localhost:5000/api/v1/auth/login

# Should see header:
# X-API-Version: v1

# Test v2
curl -i http://localhost:5000/api/v2/auth/login

# Should see header:
# X-API-Version: v2

# Test unsupported version
curl -i http://localhost:5000/api/v99/auth/login

# Should return 404 with message:
# "API version v99 is not supported"
```

## Next Steps for Backend Development

1. **Migrate More Controllers** — Add `@ApiVersions` decorators to all controllers
2. **Implement v2 Features** — When ready to release v2, add new endpoints
3. **Version-Specific DTOs** — Create separate DTOs for v1 and v2 responses
4. **Monitoring Dashboard** — Add metrics for version usage
5. **API Contract Testing** — Test each version independently

## Next Steps for Frontend Development

1. **Implement API Client** — Use provided example in FRONTEND_VERSIONING_GUIDE.md
2. **Add Version Checking** — Implement `useVersionCheck` hook
3. **Handle Deprecation** — Show banner when using deprecated version
4. **Test v2 Migration** — When v2 is available, test full migration flow
5. **Monitor Version Usage** — Track which API versions clients are using

## Files Created/Modified

### New Files
- ✅ `src/common/config/versioning.config.ts` — Version configuration
- ✅ `src/common/interceptors/versioning.interceptor.ts` — Request interceptor
- ✅ `src/common/interceptors/index.ts` — Interceptors exports
- ✅ `src/common/services/version.service.ts` — Version service
- ✅ `src/common/decorators/api-versions.decorator.ts` — Decorators
- ✅ `src/common/controllers/version-info.controller.ts` — Version info endpoint
- ✅ `src/common/common.module.ts` — Common module
- ✅ `API_VERSIONING.md` — Complete backend guide
- ✅ `harvest-finance/frontend/FRONTEND_VERSIONING_GUIDE.md` — Frontend guide

### Modified Files
- ✅ `src/main.ts` — Added VersioningInterceptor
- ✅ `src/app.module.ts` — Added CommonModule import
- ✅ `src/auth/auth.controller.ts` — Added @ApiVersions decorator
- ✅ `src/vaults/vaults.controller.ts` — Added @ApiVersions decorator

## Support & Documentation

- **Backend Guide:** [API_VERSIONING.md](./API_VERSIONING.md)
- **Frontend Guide:** [FRONTEND_VERSIONING_GUIDE.md](./harvest-finance/frontend/FRONTEND_VERSIONING_GUIDE.md)
- **Version Info Endpoint:** `GET /api/version-info`
- **Contact:** dev@harvest.finance

## Summary

✅ **URI versioning implemented** — `/api/v{N}` pattern  
✅ **Version interceptor** — Validates and adds headers  
✅ **Version service** — Manages version info  
✅ **Version info endpoint** — Public API discovery  
✅ **Deprecation support** — Headers and timeline  
✅ **Documentation** — Complete guides for backend and frontend  
✅ **Example implementation** — Auth and Vaults controllers updated  

**Frontend stability is now ensured during backend API updates!**

