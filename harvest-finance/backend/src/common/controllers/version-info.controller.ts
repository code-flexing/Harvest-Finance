/**
 * Version Info Controller
 *
 * Exposes API versioning information for clients
 * Allows frontend to discover versions, deprecation info, and migration guides
 */

import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VersionService } from '../services/version.service';

@ApiTags('system')
@Controller('api/version-info')
export class VersionInfoController {
  constructor(private versionService: VersionService) {}

  /**
   * Get all version information
   * Useful for frontend to discover supported versions and deprecation status
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get API version information' })
  @ApiResponse({
    status: 200,
    description:
      'Version information including supported versions and deprecation status',
    schema: {
      example: {
        currentVersion: '1',
        supported: ['1'],
        deprecation: {
          v1: {
            isDeprecated: false,
            deprecationDate: null,
            isSupported: true,
            isCurrent: true,
          },
        },
      },
    },
  })
  getVersionInfo() {
    return this.versionService.getVersionInfo();
  }

  /**
   * Get migration guide for a specific version
   * Provides guidance for clients migrating away from deprecated versions
   */
  @Get('migrate/:fromVersion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get migration guide for a version' })
  @ApiResponse({
    status: 200,
    description: 'Migration guide for the specified version',
    schema: {
      example: {
        message:
          'Version v1 is deprecated and will be sunset on 12/31/2025. Please migrate to v2 as soon as possible.',
        migrateToVersion: '2',
        sunsetDate: '2025-12-31',
        documentation: 'https://docs.harvest.finance/api/migration',
      },
    },
  })
  getMigrationGuide(@Param('fromVersion') fromVersion: string) {
    return {
      message: this.versionService.getMigrationGuide(fromVersion),
      migrateToVersion: this.versionService.getCurrentVersion(),
      documentation: 'https://docs.harvest.finance/api/migration',
    };
  }

  /**
   * Health check with version info
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'API health check with version info' })
  @ApiResponse({
    status: 200,
    description: 'API is healthy with version information',
  })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      currentVersion: this.versionService.getCurrentVersion(),
    };
  }
}
