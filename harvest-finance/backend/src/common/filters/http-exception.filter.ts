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
      message: message,
      errorCode: errorCode,
      timestamp: new Date().toISOString(),
      path: path,
      requestId: requestId,
    };

    let trace: string | undefined;
    if (exception instanceof Error) {
      trace = exception.stack;
    }
    
    this.logger.error(
      `[${requestId}] ${method} ${path} - Error: ${JSON.stringify(errorResponse.message)}`,
      trace,
      'ExceptionFilter',
    );

    httpAdapter.reply(response, errorResponse, status);
  }

  private getErrorCodeFromStatus(status: number): string {
    const statusMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      405: 'METHOD_NOT_ALLOWED',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return statusMap[status] || 'UNKNOWN_ERROR';
  }
}

    
