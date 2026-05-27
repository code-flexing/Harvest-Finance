/**
 * Version Service
 *
 * Centralized service for version management and utilities
 * Handles version compatibility, deprecation, and client guidance
 */

import { Injectable } from '@nestjs/common';
import {
  ApiVersionEnum,
  VERSIONING_CONFIG,
  getVersionDeprecationInfo,
  isVersionSupported,
  getSupportedVersions,
  getVersionedRoute,
} from '../config/versioning.config';

@Injectable()
export class VersionService {
  /**
   * Get current API version
   */
  getCurrentVersion(): string {
    return VERSIONING_CONFIG.current.toString();
  }

  /**
   * Get all supported versions
   */
  getSupportedVersions(): string[] {
    return getSupportedVersions();
  }

  /**
   * Check if a specific version is supported
   */
  isVersionSupported(version: string): boolean {
    return isVersionSupported(version);
  }

  /**
   * Get deprecation information for a version
   */
  getVersionDeprecationInfo(version: string) {
    return getVersionDeprecationInfo(version as ApiVersionEnum);
  }

  /**
   * Get versioned route URL
   */
  getVersionedRoute(version: string | ApiVersionEnum, route: string): string {
    return getVersionedRoute(version, route);
  }

  /**
   * Get version info for API documentation
   */
  getVersionInfo() {
    return {
      currentVersion: this.getCurrentVersion(),
      supported: this.getSupportedVersions(),
      deprecation: Object.fromEntries(
        VERSIONING_CONFIG.supported.map((v) => [
          `v${v}`,
          this.getVersionDeprecationInfo(v.toString()),
        ]),
      ),
    };
  }

  /**
   * Get migration guide for deprecated versions
   */
  getMigrationGuide(fromVersion: string): string {
    const fromInfo = this.getVersionDeprecationInfo(fromVersion);

    if (!fromInfo.isDeprecated) {
      return `Version v${fromVersion} is not deprecated.`;
    }

    const currentVersion = this.getCurrentVersion();
    const deprecationDate = fromInfo.deprecationDate
      ? new Date(fromInfo.deprecationDate).toLocaleDateString()
      : 'TBD';

    return (
      `Version v${fromVersion} is deprecated and will be sunset on ${deprecationDate}. ` +
      `Please migrate to v${currentVersion} as soon as possible. ` +
      `See migration guide at: https://docs.harvest.finance/api/migration`
    );
  }

  /**
   * Get response headers for version information
   */
  getVersionResponseHeaders(version: string) {
    const headers: Record<string, string> = {
      'X-API-Version': `v${version}`,
    };

    const deprecationInfo = this.getVersionDeprecationInfo(version);
    if (deprecationInfo.isDeprecated) {
      headers['Deprecation'] = 'true';
      if (deprecationInfo.deprecationDate) {
        headers['Sunset'] = deprecationInfo.deprecationDate.toUTCString();
      }
    }

    return headers;
  }
}
