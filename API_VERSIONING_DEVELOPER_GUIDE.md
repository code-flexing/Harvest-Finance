# API Versioning - Developer Onboarding

Welcome! This document helps you understand and work with the new API versioning system in Harvest Finance.

## What Problem Does This Solve?

**Before:** Frontend breaks when backend changes the API  
**After:** Backend and frontend evolve independently with support for multiple API versions

## Quick Overview

```
┌─────────────────────────────────────────────┐
│ Frontend                 Backend             │
│ ─────────────────────────────────────────   │
│ GET /api/v1/auth/login   → AuthController   │
│ GET /api/v2/auth/login   → AuthController   │
│ (Same endpoint, versioned URL)              │
└─────────────────────────────────────────────┘
```

## Architecture

```
Request → URL Parser → Version Validation → Interceptor → Controller → Response + Headers
         (/api/v1/)    (Is v1 supported?)   (Add headers)
```

## Core Components

### 1. Version Configuration
**File:** `src/common/config/versioning.config.ts`
- Defines supported versions (v1, v2, etc.)
- Manages deprecation dates
- Provides utility functions

### 2. Version Interceptor
**File:** `src/common/interceptors/versioning.interceptor.ts`
- Runs on every request
- Extracts version from URL path
- Validates version is supported
- Adds `X-API-Version` header to response
- Handles deprecation warnings

### 3. Version Service
**File:** `src/common/services/version.service.ts`
- Injectable service available everywhere
- Methods to check versions, get info, generate guides
- Can be injected into any controller/service

### 4. Version Info Controller
**File:** `src/common/controllers/version-info.controller.ts`
- Public endpoints for version information
- No authentication required
- Frontend uses this to discover versions

## How to Use It

### In a Controller

```typescript
// 1. Import decorator
import { ApiVersions } from '../common/decorators/api-versions.decorator';

// 2. Mark supported versions
@ApiVersions('1', '2')
@Controller('api/v1/my-resource')
export class MyResourceController {
  // Both /api/v1 and /api/v2 routes now work!
  
  // 3. Optional: Use VersionService for version-specific logic
  constructor(private versionService: VersionService) {}
  
  @Get(':id')
  async getOne(@Param('id') id: string) {
    const version = this.versionService.getCurrentVersion();
    
    if (version === '2') {
      // Return v2-specific response
      return { id, name: 'Item', newField: 'v2-feature' };
    }
    
    // Return v1 response
    return { id, name: 'Item' };
  }
}
```

### In a Service

```typescript
import { VersionService } from '../common/services/version.service';

@Injectable()
export class MyService {
  constructor(private versionService: VersionService) {}

  getData() {
    const version = this.versionService.getCurrentVersion();
    
    // Do version-specific work
    if (version === '2') {
      return this.getDataV2();
    }
    return this.getDataV1();
  }
}
```

### Check Version Info from Frontend

```javascript
// Query public endpoint
const response = await fetch('https://api.harvest.finance/api/version-info');
const info = await response.json();

console.log(info.currentVersion);  // "1"
console.log(info.supported);       // ["1", "2"]
console.log(info.deprecation);     // { v1: {...}, v2: {...} }
```

## Response Headers

Every response includes version information:

```http
HTTP/1.1 200 OK
X-API-Version: v1
Content-Type: application/json

{ "data": {...} }
```

If version is deprecated:

```http
HTTP/1.1 200 OK
X-API-Version: v1
Deprecation: true
Sunset: Wed, 31 Dec 2025 23:59:59 GMT
Warning: 299 - "API version v1 is deprecated. Migrate to v2..."
```

## Configuration

All configuration in one place: `src/common/config/versioning.config.ts`

### Update Version Status

```typescript
export const VERSIONING_CONFIG: ApiVersionConfig = {
  // Current version used by new clients
  current: ApiVersionEnum.V1,
  
  // All versions backend supports
  supported: [ApiVersionEnum.V1, ApiVersionEnum.V2],
  
  // Versions being phased out (with sunset dates)
  deprecated: new Map([
    // Example: deprecate v1 on Dec 31, 2025
    // [ApiVersionEnum.V1, new Date('2025-12-31')],
  ]),
  
  // URL prefix (usually 'api')
  versionPrefix: 'api',
};
```

## Common Workflows

### Adding a New Endpoint (v1)

```typescript
// 1. Create controller
@ApiVersions('1')
@Controller('api/v1/users')
export class UsersController {
  @Post()
  create(@Body() dto: CreateUserDto) {
    // Implementation
  }
}
```

### Supporting Endpoint in v2

```typescript
// 1. Update version support
@ApiVersions('1', '2')  // ← Add v2 support
@Controller('api/v1/users')
export class UsersController {
  @Post()
  create(@Body() dto: CreateUserDto) {
    // Can add version-specific logic here if needed
  }
}

// 2. If response format differs, handle in service:
constructor(private versionService: VersionService) {}

create(@Body() dto: CreateUserDto) {
  const version = this.versionService.getCurrentVersion();
  
  if (version === '2') {
    // Return v2 response with additional fields
    return {
      ...user,
      newV2Field: 'value',
    };
  }
  
  // Return v1 response
  return user;
}
```

### Deprecating v1

1. **Update configuration:**
   ```typescript
   deprecated: new Map([
     [ApiVersionEnum.V1, new Date('2025-12-31')],
   ]),
   ```

2. **Responses automatically include deprecation headers**

3. **Frontend sees warning and notifies users**

4. **After sunset date, v1 returns 404:**
   ```
   {
     "statusCode": 404,
     "message": "API version v1 is not supported",
     "supportedVersions": ["2"]
   }
   ```

## Testing

### Manual Testing

```bash
# Test v1 endpoint
curl -i http://localhost:5000/api/v1/auth/login

# Check version header
# Should include: X-API-Version: v1

# Test v2 endpoint
curl -i http://localhost:5000/api/v2/auth/login

# Should work the same as v1 (routes to same controller)

# Test unsupported version
curl -i http://localhost:5000/api/v99/auth/login

# Should return 404 with message about unsupported version
```

### Unit Testing

```typescript
describe('VersioningInterceptor', () => {
  it('should extract version from URL', async () => {
    const request = { path: '/api/v1/resource' };
    const version = parseVersionFromPath(request.path);
    expect(version).toBe('1');
  });

  it('should reject unsupported versions', async () => {
    const response = await client.get('/api/v99/resource');
    expect(response.status).toBe(404);
  });

  it('should add version header to response', async () => {
    const response = await client.get('/api/v1/resource');
    expect(response.headers['x-api-version']).toBe('v1');
  });
});
```

### Integration Testing

```typescript
describe('API Versioning', () => {
  it('v1 and v2 should both work for auth', async () => {
    const v1 = await client.post('/api/v1/auth/login', credentials);
    const v2 = await client.post('/api/v2/auth/login', credentials);
    
    expect(v1.status).toBe(200);
    expect(v2.status).toBe(200);
  });
});
```

## Files Overview

```
src/common/
├── config/
│   └── versioning.config.ts          ← Configuration
├── interceptors/
│   ├── versioning.interceptor.ts     ← Request processing
│   └── index.ts                      ← Exports
├── decorators/
│   └── api-versions.decorator.ts     ← @ApiVersions marker
├── services/
│   └── version.service.ts            ← Version utilities
├── controllers/
│   └── version-info.controller.ts    ← Version info endpoint
└── common.module.ts                  ← Module exports
```

## Common Issues & Solutions

### Issue: "API version not supported"

**Cause:** Endpoint not decorated with @ApiVersions for that version

**Fix:**
```typescript
@ApiVersions('1', '2')  // Add your version here
@Controller('api/v1/endpoint')
export class MyController { }
```

### Issue: Version headers not appearing

**Cause:** VersioningInterceptor not registered or URL pattern mismatch

**Fix:** Verify in `src/main.ts`:
```typescript
// Should be present
app.useGlobalInterceptors(new VersioningInterceptor(customLogger));

// And URL should match: /api/vX/...
```

### Issue: All endpoints v2 but should only be some

**Use version-specific logic instead:**
```typescript
@Get('users/:id')
async getUser(@Param('id') id: string) {
  const version = this.versionService.getCurrentVersion();
  
  if (version === '2') {
    // Only some fields in v2
    return this.service.getUserV2(id);
  }
  
  // All fields in v1
  return this.service.getUserV1(id);
}
```

## Monitoring

### Check Version Usage

```bash
# Watch for version patterns in logs
grep "Versioned request" logs/app.log

# Count by version
grep "Versioned request" logs/app.log | grep "v1" | wc -l
grep "Versioned request" logs/app.log | grep "v2" | wc -l
```

### Metrics to Track

- **Version distribution:** % of requests per version
- **Deprecation impact:** When did clients start migrating?
- **Error rate:** Compare v1 vs v2 error rates
- **Response time:** Performance by version

## Documentation

### For Backend Developers
See: [API_VERSIONING.md](../API_VERSIONING.md)

### For Frontend Developers
See: [FRONTEND_VERSIONING_GUIDE.md](../harvest-finance/frontend/FRONTEND_VERSIONING_GUIDE.md)

### Quick Reference
See: [API_VERSIONING_QUICK_REFERENCE.md](../API_VERSIONING_QUICK_REFERENCE.md)

### Implementation Details
See: [VERSIONING_IMPLEMENTATION_SUMMARY.md](../VERSIONING_IMPLEMENTATION_SUMMARY.md)

## Key Takeaways

✅ **URLs include version:** `/api/v1/resource`  
✅ **One controller = multiple versions:** No code duplication  
✅ **Transparent to clients:** Same business logic, different response formats  
✅ **Backward compatible:** Old clients keep working  
✅ **Gradual deprecation:** 6-12 months for clients to migrate  
✅ **Frontend-aware:** Receives version info in headers  

## Next Steps

1. **Add `@ApiVersions` decorator** to your controllers
2. **Test both v1 and v2 URLs** for your endpoints
3. **Implement version-specific logic** if responses differ
4. **Check frontend** handles deprecation warnings
5. **Monitor version usage** in production

## Questions?

- **Documentation:** See links above
- **Code examples:** Check example controllers (auth, vaults)
- **Issues:** Open GitHub issue or email dev@harvest.finance

---

**Ready to build with versioning!** 🚀

