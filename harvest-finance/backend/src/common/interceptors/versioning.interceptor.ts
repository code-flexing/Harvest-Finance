/**
 * API Versioning Interceptor
 *
 * Adds API version information to response headers
 * Logs version usage and deprecation warnings
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response, Request } from 'express';
import {
  ApiVersionEnum,
  VERSIONING_CONFIG,
  getVersionDeprecationInfo,
  getSupportedVersions,
  isVersionSupported,
} from '../config/versioning.config';
import { CustomLoggerService } from '../../logger/custom-logger.service';

@Injectable()
export class VersioningInterceptor implements NestInterceptor {
  constructor(private logger: CustomLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Extract version from URL path pattern: /api/vX/...
    const pathMatch = request.path.match(/^\/api\/v(\d+)(?:\/|$)/);
    const version = pathMatch ? pathMatch[1] : null;

    // Check if version is supported
    if (version && !isVersionSupported(version)) {
      this.logger.warn(
        `Unsupported API version requested: v${version}`,
        'VersioningInterceptor',
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: `API version v${version} is not supported`,
          supportedVersions: getSupportedVersions(),
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Add version headers to response
    if (version) {
      response.setHeader('X-API-Version', `v${version}`);

      const deprecationInfo = getVersionDeprecationInfo(
        version as ApiVersionEnum,
      );

      if (deprecationInfo.isDeprecated) {
        const deprecationMessage = `API version v${version} is deprecated`;
        const sunsettingDate = deprecationInfo.deprecationDate
          ? deprecationInfo.deprecationDate.toISOString()
          : 'TBD';

        response.setHeader('Deprecation', 'true');
        if (deprecationInfo.deprecationDate) {
          response.setHeader(
            'Sunset',
            deprecationInfo.deprecationDate.toUTCString(),
          );
        }
        response.setHeader(
          'Warning',
          `299 - "${deprecationMessage}. Migrate to v${VERSIONING_CONFIG.current} or later. Sunset date: ${sunsettingDate}"`,
        );

        this.logger.warn(
          `Deprecated API version v${version} used: ${deprecationMessage}`,
          'VersioningInterceptor',
        );
      }

      this.logger.debug?.(
        `Versioned request: /api/v${version}${request.path.replace(/^\/api\/v\d+/, '')}`,
        'VersioningInterceptor',
      );
    }

    return next.handle().pipe(
      tap(() => {
        // Log successful versioned request
        if (version) {
          this.logger.debug?.(
            `Versioned response sent for v${version}`,
            'VersioningInterceptor',
          );
        }
      }),
    );
  }
}
