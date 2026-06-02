import { Injectable } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService {
  static readonly contentType = promClient.register.contentType;

  readonly httpRequestsTotal: promClient.Counter<'method' | 'route' | 'status_code'>;
  readonly httpRequestDurationSeconds: promClient.Histogram<
    'method' | 'route' | 'status_code'
  >;

  constructor() {
    this.httpRequestsTotal =
      (promClient.register.getSingleMetric(
        'http_requests_total',
      ) as promClient.Counter<'method' | 'route' | 'status_code'>) ??
      new promClient.Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code'] as const,
      });

    this.httpRequestDurationSeconds =
      (promClient.register.getSingleMetric(
        'http_request_duration_seconds',
      ) as promClient.Histogram<'method' | 'route' | 'status_code'>) ??
      new promClient.Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'] as const,
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      });
  }

  async getMetrics(): Promise<string> {
    return promClient.register.metrics();
  }
}

