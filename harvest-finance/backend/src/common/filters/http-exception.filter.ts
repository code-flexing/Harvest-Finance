import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { CustomLoggerService } from '../../logger/custom-logger.service';
import { randomUUID } from 'crypto';

/**
 * Global exception filter to catch all NestJS and unhandled exceptions.
 * Formats all error responses into a consistent JSON structure:
 * {
 *   "statusCode": number,
 *   "message": "Error description or array of error details",
 *   "errorCode": "String error code",
 *   "timestamp": "ISO 8601 string",
 *   "path": "request url path",
 *   "requestId": "UUID"
 * }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: CustomLoggerService,
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    
    const path = httpAdapter.getRequestUrl(request) || '/';
    const method = httpAdapter.getRequestMethod(request) || 'UNKNOWN';

    // Retrieve x-request-id from headers or generate one
    const headers = request.headers || {};
    const requestId = headers['x-request-id'] || randomUUID();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : null;

    let message: any = 'Internal server error';
    let errorCode = 'INTERNAL_SERVER_ERROR';

    if (exceptionResponse) {
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exceptionResponse;
        errorCode =
          (exceptionResponse as any).error ||
          (exceptionResponse as any).code ||
          this.getErrorCodeFromStatus(status);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (errorCode === 'INTERNAL_SERVER_ERROR' && status !== HttpStatus.INTERNAL_SERVER_ERROR) {
      errorCode = this.getErrorCodeFromStatus(status);
    }

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

    
