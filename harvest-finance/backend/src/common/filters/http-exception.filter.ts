import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomLoggerService } from '../../logger/custom-logger.service';

/**
 * Global exception filter to catch all NestJS and unhandled exceptions.
 * Formats all error responses into a consistent JSON structure:
 * {
 *   "statusCode": number,
 *   "timestamp": "ISO 8601 string",
 *   "path": "request url path",
 *   "method": "HTTP method",
 *   "message": "Error description or array of error details"
 * }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: CustomLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || message,
    };

    // Include detailed error information in logs, but keep response clean
    let trace: string | undefined;
    if (exception instanceof Error) {
      trace = exception.stack;
    }
    this.logger.error(
      `${request.method} ${request.url} - Error: ${JSON.stringify(errorResponse.message)}`,
      trace,
      'ExceptionFilter',
    );

    response.status(status).json(errorResponse);
  }
}
