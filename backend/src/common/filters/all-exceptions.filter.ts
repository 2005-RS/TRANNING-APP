import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { NodeEnvironment } from '../../config/env.validation';

export interface ErrorResponseBody {
  statusCode: number;
  code: string;
  message: string | string[];
  path: string;
  timestamp: string;
  requestId: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const isProduction = process.env.NODE_ENV === NodeEnvironment.Production;

    const { statusCode, code, message } = this.mapException(
      exception,
      isProduction,
    );

    this.logger.error(
      JSON.stringify({
        requestId: request.requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode,
        code,
        errorName: exception instanceof Error ? exception.name : 'UnknownError',
      }),
    );

    if (!isProduction && exception instanceof Error) {
      this.logger.error(exception.stack);
    }

    const body: ErrorResponseBody = {
      statusCode,
      code,
      message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      requestId: request.requestId ?? 'unknown',
    };

    response.status(statusCode).json(body);
  }

  private mapException(
    exception: unknown,
    isProduction: boolean,
  ): Pick<ErrorResponseBody, 'statusCode' | 'code' | 'message'> {
    if (exception instanceof ThrottlerException) {
      return {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'RATE_LIMITED',
        message: 'Too many requests',
      };
    }

    if (exception instanceof QueryFailedError) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'DATABASE_ERROR',
        message: 'A database error occurred',
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message = this.extractHttpMessage(exceptionResponse);

      return {
        statusCode,
        code: this.httpErrorCode(statusCode, message),
        message,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: isProduction
        ? 'An unexpected error occurred'
        : exception instanceof Error
          ? exception.message
          : 'An unexpected error occurred',
    };
  }

  private extractHttpMessage(
    exceptionResponse: string | object,
  ): string | string[] {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      'message' in exceptionResponse &&
      (typeof exceptionResponse.message === 'string' ||
        Array.isArray(exceptionResponse.message))
    ) {
      return exceptionResponse.message;
    }

    return 'Request failed';
  }

  private httpErrorCode(
    statusCode: number,
    message: string | string[],
  ): string {
    if (statusCode === HttpStatus.BAD_REQUEST && Array.isArray(message)) {
      return 'VALIDATION_ERROR';
    }

    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'PAYLOAD_TOO_LARGE';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      default:
        return 'HTTP_ERROR';
    }
  }
}
