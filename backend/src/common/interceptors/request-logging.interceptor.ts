import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.log(request, response.statusCode, Date.now() - startedAt);
        },
        error: (error: unknown) => {
          const status =
            typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            typeof error.status === 'number'
              ? error.status
              : 500;
          this.log(request, status, Date.now() - startedAt);
        },
      }),
    );
  }

  private log(request: Request, statusCode: number, durationMs: number): void {
    this.logger.log(
      JSON.stringify({
        requestId: request.requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode,
        durationMs,
      }),
    );
  }
}
