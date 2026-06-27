import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { CustomLoggerService } from '../../logger/custom-logger.service';

/**
 * Global exception filter to catch all NestJS and unhandled exceptions.
 * Formats all error responses into a consistent JSON structure:
 * {
 *   "statusCode": number,
 *   "message": string | string[],
 *   "errorCode": string | number,
 *   "timestamp": "ISO 8601 string",
 *   "path": string,
 *   "requestId": string
 * }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: CustomLoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest(); // Native request (Express/Fastify)
    const response = ctx.getResponse(); // Native response

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract or generate a unique request ID for tracing
    const requestId =
      request.headers['x-request-id'] ||
      request.id ||
      `req-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Determine error code: prefer existing errorCode on exception, fallback to status code
    const errorCode =
      (exception as any).errorCode ||
      (exception instanceof HttpException ? status.toString() : '500');

    const errorResponse = {
      statusCode: status,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || message,
      errorCode: errorCode,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      requestId: requestId,
    };

    // Log error with requestId for correlation; include stack trace in development
    const logMessage = `[Request ID: ${requestId}] ${request.method} ${httpAdapter.getRequestUrl(
      request,
    )} - Error: ${JSON.stringify(errorResponse.message)}`;
    if (
      process.env.NODE_ENV !== 'production' &&
      exception instanceof Error &&
      exception.stack
    ) {
      this.logger.error(logMessage, exception.stack);
    } else {
      this.logger.error(logMessage);
    }

    httpAdapter.reply(response, errorResponse, status);
  }
}

    
