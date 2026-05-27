import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class AnalyticsInterceptor implements NestInterceptor {
  constructor(private readonly analyticsService: AnalyticsService) {}

  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    this.analyticsService.incrementRequests();
    return next.handle().pipe(
      catchError((err) => {
        this.analyticsService.incrementErrors();
        return throwError(() => err);
      }),
    );
  }
}
