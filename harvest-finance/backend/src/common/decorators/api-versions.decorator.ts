/**
 * API Version Decorator
 *
 * Marks a controller or method as supporting specific API versions
 * Used for documentation and routing
 */

import { SetMetadata } from '@nestjs/common';

export const API_VERSIONS_KEY = 'api_versions';

/**
 * Decorator to mark supported versions for a controller or method
 * @param versions Array of supported API versions (e.g., ['1', '2'])
 */
export const ApiVersions = (...versions: string[]) =>
  SetMetadata(API_VERSIONS_KEY, versions);

/**
 * Decorator to mark a method/controller as requiring a specific minimum version
 * @param version Minimum API version required (e.g., '2')
 */
export const MinApiVersion = (version: string) =>
  SetMetadata('min_api_version', version);

/**
 * Decorator to mark a method/controller as deprecated in a specific version
 * @param version The version where this became deprecated
 * @param sunsetDate When this will be removed (optional)
 */
export const DeprecatedInVersion = (version: string, sunsetDate?: Date) =>
  SetMetadata('deprecated_version', { version, sunsetDate });
