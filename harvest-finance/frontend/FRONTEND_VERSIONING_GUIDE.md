# API Versioning - Frontend Integration Guide

## Overview

This guide explains how to integrate API versioning into the Harvest Finance React frontend. It ensures application stability when the backend releases new API versions.

## Quick Start

### 1. Set API Version in Environment

```bash
# .env.development
REACT_APP_API_URL=http://localhost:5000
REACT_APP_API_VERSION=v1

# .env.staging
REACT_APP_API_URL=https://staging.harvest.finance
REACT_APP_API_VERSION=v1

# .env.production
REACT_APP_API_URL=https://api.harvest.finance
REACT_APP_API_VERSION=v1
```

### 2. Create Centralized API Client

```typescript
// src/api/client.ts
import axios, { AxiosResponse, AxiosError } from 'axios';
import { store } from '../store/store';
import { logoutUser } from '../store/auth/authSlice';

// Get version from environment
const API_VERSION = process.env.REACT_APP_API_VERSION || 'v1';
const BASE_URL = `${process.env.REACT_APP_API_URL}/api/${API_VERSION}`;

// Create axios instance
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - Handle version info and deprecation
apiClient.interceptors.response.use(
  (response) => {
    // Check for deprecation headers
    checkDeprecation(response);
    
    // Store current API version
    const version = response.headers['x-api-version'];
    if (version) {
      sessionStorage.setItem('api_version', version);
    }
    
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - logout user
      store.dispatch(logoutUser());
    }
    return Promise.reject(error);
  },
);

/**
 * Check for deprecation headers and notify user
 */
function checkDeprecation(response: AxiosResponse) {
  const deprecation = response.headers['deprecation'];
  const sunset = response.headers['sunset'];
  const warning = response.headers['warning'];

  if (deprecation === 'true') {
    console.warn('API Deprecation Warning:', warning);
    
    // Store deprecation info for UI
    sessionStorage.setItem('api_deprecation', JSON.stringify({
      isDeprecated: true,
      sunsetDate: sunset,
      warning,
    }));
    
    // Show banner to user (optional)
    // displayDeprecationBanner(sunset);
  }
}

export default apiClient;
```

### 3. Create API Service Layer

```typescript
// src/services/auth.service.ts
import apiClient from '../api/client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const authService = {
  async login(payload: LoginPayload) {
    const response = await apiClient.post('/auth/login', payload);
    return response.data;
  },

  async register(payload: RegisterPayload) {
    const response = await apiClient.post('/auth/register', payload);
    return response.data;
  },

  async refresh() {
    const refreshToken = localStorage.getItem('refresh_token');
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },
};

// src/services/vaults.service.ts
export const vaultsService = {
  async getMyVaults() {
    const response = await apiClient.get('/vaults/my-vaults');
    return response.data;
  },

  async depositToVault(vaultId: string, amount: number) {
    const response = await apiClient.post(`/vaults/${vaultId}/deposit`, { amount });
    return response.data;
  },

  async withdrawFromVault(vaultId: string, amount: number) {
    const response = await apiClient.post(`/vaults/${vaultId}/withdraw`, { amount });
    return response.data;
  },
};

// src/services/version.service.ts
export const versionService = {
  async getVersionInfo() {
    try {
      const response = await apiClient.get('/version-info');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch version info:', error);
      return null;
    }
  },

  async getMigrationGuide(fromVersion: string) {
    try {
      const response = await apiClient.get(`/version-info/migrate/${fromVersion}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch migration guide:', error);
      return null;
    }
  },

  getCurrentVersion(): string {
    return sessionStorage.getItem('api_version') || 'v1';
  },

  getDeprecationInfo() {
    const info = sessionStorage.getItem('api_deprecation');
    return info ? JSON.parse(info) : null;
  },
};
```

### 4. Handle Version Changes

```typescript
// src/hooks/useVersionCheck.ts
import { useEffect, useCallback } from 'react';
import { versionService } from '../services/version.service';

/**
 * Hook to periodically check for API version updates
 */
export function useVersionCheck(interval = 3600000) { // 1 hour
  const checkForUpdates = useCallback(async () => {
    const versionInfo = await versionService.getVersionInfo();
    
    if (!versionInfo) return;

    const currentStored = versionService.getCurrentVersion();
    const currentSupported = versionInfo.currentVersion;

    // If current version is not supported, notify and redirect
    if (!versionInfo.supported.includes(currentStored)) {
      console.warn('Current API version is no longer supported');
      
      // Show notification to user
      showNotification({
        type: 'warning',
        title: 'API Update Required',
        message: 'Please refresh your browser to get the latest version',
        action: () => window.location.reload(),
      });
    }

    // Check for deprecation
    Object.entries(versionInfo.deprecation).forEach(([version, info]: [string, any]) => {
      if (info.isDeprecated && currentStored === version.replace('v', '')) {
        const sunsetDate = new Date(info.deprecationDate);
        const daysUntilSunset = Math.floor(
          (sunsetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilSunset <= 30) {
          console.warn(`API version ${version} will sunset in ${daysUntilSunset} days`);
          
          // Show deprecation notice
          showDeprecationNotice({
            version: version,
            sunsetDate: sunsetDate,
            daysRemaining: daysUntilSunset,
          });
        }
      }
    });
  }, []);

  useEffect(() => {
    // Check on mount
    checkForUpdates();

    // Check periodically
    const timer = setInterval(checkForUpdates, interval);

    return () => clearInterval(timer);
  }, [checkForUpdates, interval]);
}

// src/components/DeprecationBanner.tsx
import React from 'react';
import { Alert, Button } from '@/components/ui';

interface DeprecationBannerProps {
  version: string;
  sunsetDate: Date;
  daysRemaining: number;
}

export function DeprecationBanner({
  version,
  sunsetDate,
  daysRemaining,
}: DeprecationBannerProps) {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Alert
      variant="warning"
      title={`API Version ${version} Deprecating`}
      description={`This version of the Harvest Finance API will be discontinued on ${sunsetDate.toLocaleDateString()}. Please refresh your browser to update. (${daysRemaining} days remaining)`}
    >
      <Button onClick={handleRefresh} variant="warning">
        Refresh Now
      </Button>
    </Alert>
  );
}
```

### 5. Add Version Check on App Load

```typescript
// src/App.tsx
import React, { useEffect } from 'react';
import { useVersionCheck } from './hooks/useVersionCheck';
import { versionService } from './services/version.service';

function App() {
  // Check for version updates every hour
  useVersionCheck(3600000);

  useEffect(() => {
    // Check version on app mount
    checkInitialVersion();
  }, []);

  async function checkInitialVersion() {
    try {
      const versionInfo = await versionService.getVersionInfo();
      console.log('API Version Info:', versionInfo);
    } catch (error) {
      console.error('Failed to check API version:', error);
    }
  }

  return (
    <div className="app">
      {/* Your app content */}
    </div>
  );
}

export default App;
```

### 6. Handle Version-Specific Responses

```typescript
// src/utils/responseHandler.ts
export function handleVersionedResponse(data: any, version: string) {
  // Handle v1 responses
  if (version === 'v1') {
    return {
      ...data,
      // v1-specific handling
    };
  }

  // Handle v2 responses with new fields
  if (version === 'v2') {
    return {
      ...data,
      // v2-specific handling
      // e.g., newField handling, deprecatedField migration, etc.
    };
  }

  return data;
}

// Usage in services
export const vaultsService = {
  async getMyVaults() {
    const response = await apiClient.get('/vaults/my-vaults');
    const version = versionService.getCurrentVersion();
    return handleVersionedResponse(response.data, version);
  },
};
```

## Environment Configuration

### Development

```bash
# .env.development
REACT_APP_API_URL=http://localhost:5000
REACT_APP_API_VERSION=v1
REACT_APP_DEBUG=true
```

### Staging

```bash
# .env.staging
REACT_APP_API_URL=https://staging-api.harvest.finance
REACT_APP_API_VERSION=v1
REACT_APP_DEBUG=false
```

### Production

```bash
# .env.production
REACT_APP_API_URL=https://api.harvest.finance
REACT_APP_API_VERSION=v1
REACT_APP_DEBUG=false
```

## Migrating to a New API Version

### When Backend Releases v2

1. **Verify v2 is Stable**
   ```bash
   # Test v2 endpoints in staging
   curl https://staging-api.harvest.finance/api/v2/health
   ```

2. **Update Frontend Configuration**
   ```bash
   # .env.production
   REACT_APP_API_VERSION=v2  # Change from v1 to v2
   ```

3. **Handle Response Differences**
   ```typescript
   // Update response handlers for new v2 fields
   function handleVersionedResponse(data: any, version: string) {
     if (version === 'v2') {
       // Handle new v2 fields
       return {
         ...data,
         newV2Field: data.newV2Field || null,
       };
     }
     return data;
   }
   ```

4. **Test Thoroughly**
   - Test all major flows in staging with v2
   - Verify deprecation headers are handled
   - Check performance and error handling

5. **Deploy with Confidence**
   - Roll out to production
   - Monitor API version distribution
   - Keep v1 support available

## Testing API Version Changes

```typescript
// src/__tests__/api/versioning.test.ts
import { apiClient, versionService } from '@/api';

describe('API Versioning', () => {
  test('should include X-API-Version header in responses', async () => {
    const response = await apiClient.get('/health');
    expect(response.headers['x-api-version']).toBeDefined();
  });

  test('should handle deprecation headers', async () => {
    const response = await apiClient.get('/health');
    
    if (response.headers['deprecation'] === 'true') {
      expect(response.headers['sunset']).toBeDefined();
      expect(response.headers['warning']).toBeDefined();
    }
  });

  test('should store current API version', async () => {
    await apiClient.get('/health');
    const version = versionService.getCurrentVersion();
    expect(version).toMatch(/^v\d+$/);
  });

  test('should fetch version info', async () => {
    const versionInfo = await versionService.getVersionInfo();
    expect(versionInfo.currentVersion).toBeDefined();
    expect(versionInfo.supported).toBeInstanceOf(Array);
  });
});
```

## Monitoring & Debugging

### Check Current Version

```typescript
// In browser console
sessionStorage.getItem('api_version')  // Should return 'v1' or 'v2'
sessionStorage.getItem('api_deprecation')  // Check deprecation status
```

### View API Requests

```typescript
// Enable verbose logging
apiClient.interceptors.request.use((config) => {
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] Response: ${response.status}`);
    console.log(`[API] Version: ${response.headers['x-api-version']}`);
    return response;
  },
  (error) => {
    console.error(`[API] Error: ${error.message}`);
    return Promise.reject(error);
  },
);
```

## Best Practices

✅ **Do:**
- Use environment variables for API version
- Centralize API client configuration
- Handle deprecation headers gracefully
- Test version migrations in staging first
- Monitor which versions clients are using
- Provide clear migration guidance

❌ **Don't:**
- Hardcode API URLs or versions in components
- Ignore deprecation warnings
- Deploy v2 without thorough testing
- Remove v1 before sunset date expires
- Call backend without version-specific handling

## Troubleshooting

### Issue: "404 API version not supported"

**Problem:** Frontend is calling an unsupported API version

**Solution:**
```typescript
// Update .env
REACT_APP_API_VERSION=v1  # Update to supported version

// Or check supported versions
const info = await versionService.getVersionInfo();
console.log('Supported:', info.supported);  // See available versions
```

### Issue: Requests Still Going to Old Version

**Problem:** Browser cached old API client code

**Solution:**
```typescript
// Clear browser storage and refresh
sessionStorage.clear();
localStorage.removeItem('api_cache');
window.location.reload();
```

### Issue: Authentication Failing After Version Switch

**Problem:** Token format changed between versions

**Solution:**
```typescript
// Re-authenticate after version switch
const handleVersionSwitch = async () => {
  // Clear old tokens
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  
  // Redirect to login
  window.location.href = '/login';
};
```

## Additional Resources

- Backend Versioning Guide: [API_VERSIONING.md](../API_VERSIONING.md)
- Migration Checklist: See backend documentation
- API Documentation: https://api.harvest.finance/api/docs
- Support: dev@harvest.finance

