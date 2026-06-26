import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { pinoHttp } from 'pino-http';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private internalLogger: ReturnType<typeof pinoHttp>;

  constructor(private readonly configService: ConfigService) {
    const logLevel = this.configService.get<string>('LOG_LEVEL') || 'info';

    this.internalLogger = pinoHttp({
      level: logLevel,
      // Rule: Exclude health check and metric endpoints to eliminate log noise
      autoLogging: {
        ignore: (req: Request) => {
          const ignoredPaths = ['/health', '/metrics', '/api/docs'];
          return ignoredPaths.some((path) => req.url?.includes(path));
        },
      },
      // Assign or forward a consistent Request ID
      genReqId: (req: Request) => {
        return req.headers['x-request-id'] || uuidv4();
      },
      // Custom formatting to meet exact field requirements
      customSuccessMessage: (req: Request, res: Response, responseTime: number) => {
        return `${req.method} ${req.url} - Status: ${res.statusCode} - Duration: ${responseTime}ms`;
      },
      customErrorMessage: (req: Request, res: Response, error: Error) => {
        return `${req.method} ${req.url} - Status: ${res.statusCode} - Error: ${error.message}`;
      },
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    this.internalLogger(req, res, next);
  }
}