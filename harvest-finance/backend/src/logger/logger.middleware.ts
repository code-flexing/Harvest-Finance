import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CustomLoggerService } from './custom-logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: CustomLoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const { ip, method, originalUrl } = req;
    const userAgent = req.get('user-agent') ?? '';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const durationMs = Date.now() - startTime;
      const fields = {
        msg: `${method} ${originalUrl} ${statusCode} ${durationMs}ms`,
        method,
        url: originalUrl,
        statusCode,
        durationMs,
        userAgent,
        ip,
      };

      if (statusCode >= 500) {
        this.logger.error(fields, undefined, 'HTTP');
      } else if (statusCode >= 400) {
        this.logger.warn(fields, 'HTTP');
      } else {
        this.logger.log(fields, 'HTTP');
      }
    });

    next();
  }
}
