import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Only intercept HTTP requests (ignore WebSockets, GraphQL, etc.)
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((resData) => {
        // If response headers are already sent, or it's a 204 No Content / 304 Not Modified, bypass
        if (
          response.headersSent ||
          response.statusCode === 204 ||
          response.statusCode === 304
        ) {
          return resData;
        }

        // Avoid wrapping buffers, streams, or StreamableFile instances
        if (
          Buffer.isBuffer(resData) ||
          (resData &&
            typeof resData === 'object' &&
            ('getStream' in resData ||
              'stream' in resData ||
              resData.constructor?.name === 'StreamableFile'))
        ) {
          return resData;
        }

        // If returned data is null or undefined, return clean standard empty envelope
        if (resData === null || resData === undefined) {
          return {
            data: null,
            meta: {},
          };
        }

        // Handle object responses
        if (typeof resData === 'object') {
          const hasData = 'data' in resData;
          const hasMeta = 'meta' in resData;

          // Case 1: Already enveloped in { data, meta }
          if (hasData && hasMeta) {
            return {
              data: resData.data,
              meta:
                resData.meta && typeof resData.meta === 'object'
                  ? resData.meta
                  : {},
            };
          }

          // Case 2: Object has a 'data' key but no 'meta' key (e.g. { data: T[], total: number })
          if (hasData && !hasMeta) {
            const { data, ...rest } = resData;
            return {
              data,
              meta: rest,
            };
          }

          // Case 3: Paginated structure with { items: T[], total: number }
          const hasItems = 'items' in resData && Array.isArray(resData.items);
          const hasTotal =
            'total' in resData && typeof resData.total === 'number';

          if (hasItems && hasTotal) {
            const { items, total, ...rest } = resData;
            return {
              data: items,
              meta: {
                total,
                ...rest,
              },
            };
          }
        }

        // Default Case: Wrap the response raw data
        return {
          data: resData,
          meta: {},
        };
      }),
    );
  }
}
