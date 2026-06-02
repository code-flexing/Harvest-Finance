import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    // Avoid scraping loops and unnecessary cardinality.
    const rawPath: string | undefined =
      req?.route?.path ?? req?.path ?? req?.url ?? req?.originalUrl;
    if (rawPath === '/metrics') {
      return next.handle();
    }

    const start = process.hrtime.bigint();

    return next.handle().pipe(
      finalize(() => {
        const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
        const method = String(req?.method ?? 'UNKNOWN');
        const statusCode = String(res?.statusCode ?? 0);
        const route = this.buildRouteLabel(req, rawPath);

        this.metrics.httpRequestsTotal
          .labels(method, route, statusCode)
          .inc(1);

        this.metrics.httpRequestDurationSeconds
          .labels(method, route, statusCode)
          .observe(durationSeconds);
      }),
    );
  }

  private buildRouteLabel(req: any, fallbackPath: string | undefined): string {
    const baseUrl = typeof req?.baseUrl === 'string' ? req.baseUrl : '';
    const routePath = typeof req?.route?.path === 'string' ? req.route.path : '';
    const composed = `${baseUrl}${routePath}`.trim();
    if (composed) return composed;

    const pathOnly = typeof fallbackPath === 'string' ? fallbackPath : 'unknown';
    return pathOnly.split('?')[0] || 'unknown';
  }
}

