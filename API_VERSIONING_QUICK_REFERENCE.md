# API Versioning - Quick Reference

## 🚀 Common Tasks

### Check Current Configuration

```bash
# View current version config
cat src/common/config/versioning.config.ts

# Test version endpoint
curl http://localhost:5000/api/version-info
```

### Add Versioning to a Controller

```typescript
import { ApiVersions } from '../common/decorators/api-versions.decorator';

@ApiTags('My Resource')
@ApiVersions('1', '2')  // ← Add this line
@Controller('api/v1/my-resource')
export class MyResourceController {
  // Routes automatically support both v1 and v2
}
```

### Support Version-Specific Logic

```typescript
import { VersionService } from '../common/services/version.service';

export class MyResourceController {
  constructor(
    private service: MyService,
    private versionService: VersionService,
  ) {}

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const version = this.versionService.getCurrentVersion();

    if (version === '2') {
      return await this.service.getOneV2(id);  // New format
    }
    return await this.service.getOneV1(id);    // Legacy format
  }
}
```

### Deprecate a Version

1. **Set deprecation date:**
   ```typescript
   // src/common/config/versioning.config.ts
   deprecated: new Map([
     [ApiVersionEnum.V1, new Date('2025-12-31')],
   ]),
   ```

2. **Responses automatically include:**
   ```
   Deprecation: true
   Sunset: Wed, 31 Dec 2025 23:59:59 GMT
   Warning: 299 - "API version v1 is deprecated..."
   ```

3. **Frontend will see deprecation headers** and can notify users

### Release a New Version

1. **Update supported versions:**
   ```typescript
   // src/common/config/versioning.config.ts
   current: ApiVersionEnum.V2,
   supported: [ApiVersionEnum.V1, ApiVersionEnum.V2],
   ```

2. **Test both versions:**
   ```bash
   curl -i http://localhost:5000/api/v1/resource  # Should work
   curl -i http://localhost:5000/api/v2/resource  # Should work
   ```

3. **Frontend updates .env:**
   ```bash
   REACT_APP_API_VERSION=v2
   ```

### Test in Frontend

```typescript
// Check supported versions
const info = await fetch('/api/version-info').then(r => r.json());
console.log('Supported:', info.supported);  // ['1', '2']

// Get migration guide
const guide = await fetch('/api/version-info/migrate/v1').then(r => r.json());
console.log(guide.message);  // Migration instructions
```

---

## 📋 URL Patterns

```
GET    /api/v1/auth/login              → POST login
POST   /api/v1/auth/register           → POST register
POST   /api/v1/auth/refresh            → POST refresh token
POST   /api/v1/auth/logout             → POST logout

GET    /api/v1/vaults/my-vaults        → GET user vaults
POST   /api/v1/vaults/{id}/deposit     → POST deposit
POST   /api/v1/vaults/{id}/withdraw    → POST withdraw

GET    /api/version-info               → Get version info
GET    /api/version-info/migrate/{v}   → Migration guide
GET    /api/version-info/health        → Health check
```

---

## 🔍 Response Headers

```http
X-API-Version: v1

# Only if deprecated:
Deprecation: true
Sunset: Wed, 31 Dec 2025 23:59:59 GMT
Warning: 299 - "API version v1 is deprecated..."
```

---

## 🛠️ Configuration Quick Links

| File | Purpose |
|------|---------|
| `src/common/config/versioning.config.ts` | Version configuration |
| `src/common/interceptors/versioning.interceptor.ts` | Request processing |
| `src/common/services/version.service.ts` | Version utilities |
| `src/common/decorators/api-versions.decorator.ts` | Controller decorators |
| `src/main.ts` | Interceptor registration |

---

## ✅ Checklist for Version Updates

### Adding a New Endpoint

- [ ] Add `@ApiVersions('1', '2')` decorator to controller
- [ ] Keep route as `/api/v1/endpoint` (v2 routes through same handler)
- [ ] Implement version-specific logic if needed
- [ ] Add Swagger documentation
- [ ] Test with both `/api/v1/...` and `/api/v2/...` URLs

### Deprecating a Version

- [ ] Set `deprecationDate` in versioning config
- [ ] Announce via documentation and email
- [ ] Deprecation headers automatically included
- [ ] Frontend receives warnings
- [ ] Monitor migration rate
- [ ] After sunset period, remove support

### Releasing a New Version

- [ ] Update `current` version in config
- [ ] Ensure `supported` includes both old and new
- [ ] Test all endpoints in both versions
- [ ] Update documentation
- [ ] Notify clients via email/banner
- [ ] Monitor version distribution
- [ ] Plan deprecation of old version

---

## 🐛 Troubleshooting

### Endpoint Returns 404 for v2

**Problem:** `GET /api/v2/my-endpoint` returns 404  
**Solution:** Add `@ApiVersions('2')` decorator to controller

```typescript
@ApiVersions('1', '2')  // ← Add v2 here
@Controller('api/v1/resource')
export class ResourceController { }
```

### Headers Not Showing Version

**Problem:** Response missing `X-API-Version` header  
**Solution:** Ensure VersioningInterceptor is registered in main.ts

```typescript
// src/main.ts
app.useGlobalInterceptors(new VersioningInterceptor(customLogger));
```

### Unsupported Version Not Returning 404

**Problem:** Invalid version like v99 doesn't return error  
**Solution:** Check if path matches pattern `/api/v(\d+)/`

```bash
curl -i http://localhost:5000/api/v99/resource
# Should return 404 with: "API version v99 is not supported"
```

### Frontend Not Getting Deprecation Banner

**Problem:** Frontend doesn't see deprecation headers  
**Solution:** Check response interceptor is handling headers

```typescript
apiClient.interceptors.response.use((response) => {
  const deprecation = response.headers['deprecation'];
  if (deprecation === 'true') {
    // Show banner
  }
  return response;
});
```

---

## 📚 Full Documentation

- **Backend:** [API_VERSIONING.md](./API_VERSIONING.md)
- **Frontend:** [FRONTEND_VERSIONING_GUIDE.md](./harvest-finance/frontend/FRONTEND_VERSIONING_GUIDE.md)
- **Implementation:** [VERSIONING_IMPLEMENTATION_SUMMARY.md](./VERSIONING_IMPLEMENTATION_SUMMARY.md)

---

## 🎯 Key Principles

1. **URLs include version:** `/api/v{N}/...`
2. **One controller = Multiple versions:** Same handler for v1 and v2
3. **Responses have headers:** `X-API-Version` always included
4. **Deprecation is gradual:** 6-12 months before sunset
5. **Frontend controls version:** Via environment variable
6. **Version info is public:** Query `/api/version-info` anytime

---

## 📞 Support

- **Questions?** dev@harvest.finance
- **Found a bug?** Open GitHub issue
- **Migration help?** See full documentation

