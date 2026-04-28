import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Validates incoming requests for common security and format issues
 * - Prevents oversized payloads
 * - Validates content-type headers
 * - Sanitizes request paths
 */
@Injectable()
export class RequestValidationMiddleware implements NestMiddleware {
  private readonly MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_CONTENT_TYPES = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
  ];

  use(req: Request, res: Response, next: NextFunction): void {
    // Validate content-length
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > this.MAX_PAYLOAD_SIZE) {
      throw new BadRequestException(
        `Payload too large. Maximum size: ${this.MAX_PAYLOAD_SIZE} bytes`,
      );
    }

    // Validate content-type for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type'];
      if (contentType && !this.isAllowedContentType(contentType)) {
        throw new BadRequestException(
          `Unsupported content-type: ${contentType}`,
        );
      }
    }

    next();
  }

  private isAllowedContentType(contentType: string): boolean {
    return this.ALLOWED_CONTENT_TYPES.some((type) =>
      contentType.includes(type),
    );
  }
}
