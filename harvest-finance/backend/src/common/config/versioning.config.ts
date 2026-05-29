/**
 * API Versioning Configuration
 *
 * Manages API versions and deprecation schedules.
 * Ensures frontend stability during backend updates.
 *
 *   Before editing this file, read the versioning guide:
 *    docs/api/versioning.md
 *
 * Strategy: URI versioning only — /api/v{N}/{resource}
 * Header versioning is NOT used in this project.
 */

export enum ApiVersionEnum {
  V1 = '1',
  V2 = '2',
}

export interface ApiVersionConfig {
  current: ApiVersionEnum;
  supported: ApiVersionEnum[];
  deprecated: Map<ApiVersionEnum, Date | null>;
  versionPrefix: string;
}

export const VERSIONING_CONFIG: ApiVersionConfig = {
  current: ApiVersionEnum.V1,
  supported: [ApiVersionEnum.V1],
  deprecated: new Map([
    // Example: [ApiVersionEnum.V0, new Date('2025-12-31')],
    // Null means no deprecation date set
  ]),
  versionPrefix: 'api',
};

/**
 * Get deprecation status for a version
 * @param version The API version to check
 * @returns Object with deprecation status
 */
export function getVersionDeprecationInfo(version: ApiVersionEnum) {
  const deprecationDate = VERSIONING_CONFIG.deprecated.get(version);

  return {
    isDeprecated: VERSIONING_CONFIG.deprecated.has(version),
    deprecationDate: deprecationDate || null,
    isSupported: VERSIONING_CONFIG.supported.includes(version),
    isCurrent: version === VERSIONING_CONFIG.current,
  };
}

/**
 * Get supported versions as array
 */
export function getSupportedVersions(): string[] {
  return VERSIONING_CONFIG.supported.map((v) => v.toString());
}

/**
 * Check if version is supported
 */
export function isVersionSupported(version: string): boolean {
  return VERSIONING_CONFIG.supported.includes(version as ApiVersionEnum);
}

/**
 * Get the API versioning strategy URI format
 * Returns format like: /api/v1/resource, /api/v2/resource
 */
export function getVersionedRoute(
  version: ApiVersionEnum | string,
  route: string,
): string {
  const v = String(version);
  const cleanRoute = route.startsWith('/') ? route : `/${route}`;
  return `${VERSIONING_CONFIG.versionPrefix}/v${v}${cleanRoute}`;
}
