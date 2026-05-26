import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';

/**
 * Global exception filter that intercepts ThrottlerException and converts it
 * into a consistent HTTP 429 JSON response.
 *
 * Skip conditions (when this filter does NOT run):
 *  - Any exception that is NOT a ThrottlerException passes through untouched.
 *    The @Catch(ThrottlerException) decorator narrows scope to throttler errors only.
 *  - Non-HTTP execution contexts (WebSocket, GraphQL, RPC) bypass this filter because
 *    host.switchToHttp() is called unconditionally. If those transports are added
 *    in the future, check host.getType() first and handle each context separately.
 *
 * Countdown / retry behavior:
 *  - NestJS Throttler tracks the request count and TTL window internally (in-memory
 *    or via a cache store). Once the window expires the counter resets automatically
 *    and the client can retry — no action is required from this filter.
 *  - This filter intentionally does NOT emit a Retry-After header. If you want clients
 *    to know exactly how long to wait, inject ThrottlerStorage, read the remaining TTL,
 *    and add `response.header('Retry-After', ttlSeconds)` before the .json() call.
 *
 * Why the exception argument is named `_`:
 *  - ThrottlerException carries no additional metadata that changes the response shape,
 *    so the parameter is intentionally unused. The leading underscore suppresses the
 *    "unused variable" lint warning without disabling the rule globally.
 */
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(_: ThrottlerException, host: ArgumentsHost) {
    // Assumes HTTP context. See skip conditions in the class comment above
    // before adding WebSocket or GraphQL support.
    const response = host.switchToHttp().getResponse<Response>();

    // Return a uniform 429 envelope so API consumers always see the same shape.
    // The message is intentionally generic — avoid leaking rate-limit thresholds
    // (e.g. "limit is 100 req/min") that could aid abuse.
    response.status(HttpStatus.TOO_MANY_REQUESTS).json({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      error: 'Too Many Requests',
      message: 'Too many requests. Please try again later.',
    });
  }
}
