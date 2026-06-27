import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    // Generate or extract request ID for correlation
    const requestId =
      request.headers['x-request-id'] ||
      request.id ||
      `req-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Determine HTTP status code
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract message from exception
    const message =
      exception instanceof HttpException
        ? (exception.response as any)?.message || exception.message
        : exception.message ||
          'Internal server error';

    // Use status code as error code (can be customized further)
    const errorCode = httpStatus.toString();

    // Build response envelope
    const responseBody = {
      statusCode: httpStatus,
      message,
      errorCode,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      requestId,
    };

    // Log error with request ID for correlation
    const logMessage = `[Request ID: ${requestId}] ${message}`;
    if (
      process.env.NODE_ENV !== 'production' &&
      exception instanceof Error &&
      exception.stack
    ) {
      this.logger.error(logMessage, exception.stack);
    } else {
      this.logger.error(logMessage);
    }

    // Send response
    httpAdapter.reply(response, responseBody, httpStatus);
  }
}