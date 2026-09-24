import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Request } from 'express';
import {
  EnvironmentVariables,
  NodeEnvironment,
} from '../../../config/env.validation';
import { AUTH_COOKIE_PATH } from '../auth.constants';

@Injectable()
export class AuthCookieService {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  cookieName(): string {
    return this.config.getOrThrow('AUTH_REFRESH_COOKIE_NAME', { infer: true });
  }

  read(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, string> | undefined;
    const value = cookies?.[this.cookieName()];
    return typeof value === 'string' ? value : undefined;
  }

  buildOptions(expiresAt: Date): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.getOrThrow('AUTH_COOKIE_SECURE', { infer: true }),
      sameSite: this.config.getOrThrow('AUTH_COOKIE_SAME_SITE', {
        infer: true,
      }),
      path: AUTH_COOKIE_PATH,
      expires: expiresAt,
      maxAge: Math.max(0, expiresAt.getTime() - Date.now()),
    };
  }

  clearOptions(): CookieOptions {
    const nodeEnv = this.config.getOrThrow('NODE_ENV', { infer: true });
    return {
      httpOnly: true,
      secure:
        nodeEnv === NodeEnvironment.Production
          ? true
          : this.config.getOrThrow('AUTH_COOKIE_SECURE', { infer: true }),
      sameSite: this.config.getOrThrow('AUTH_COOKIE_SAME_SITE', {
        infer: true,
      }),
      path: AUTH_COOKIE_PATH,
    };
  }
}
