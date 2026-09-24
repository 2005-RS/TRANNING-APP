import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EnvironmentVariables } from '../../../config/env.validation';
import { UserRole } from '../../users/enums/user-role.enum';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  sid: string;
}

@Injectable()
export class AccessTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  sign(payload: AccessTokenPayload): string {
    return this.jwt.sign(payload, {
      algorithm: 'HS256',
      issuer: this.config.getOrThrow('JWT_ACCESS_ISSUER', { infer: true }),
      audience: this.config.getOrThrow('JWT_ACCESS_AUDIENCE', { infer: true }),
      expiresIn: this.config.getOrThrow('JWT_ACCESS_EXPIRES_IN', {
        infer: true,
      }),
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  verify(token: string): AccessTokenPayload {
    try {
      const payload = this.jwt.verify<AccessTokenPayload>(token, {
        algorithms: ['HS256'],
        issuer: this.config.getOrThrow('JWT_ACCESS_ISSUER', { infer: true }),
        audience: this.config.getOrThrow('JWT_ACCESS_AUDIENCE', {
          infer: true,
        }),
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET', { infer: true }),
      });

      if (!payload.sub || !payload.role || !payload.sid) {
        throw new UnauthorizedException('Invalid access token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  expiresInSeconds(): number {
    return this.config.getOrThrow('JWT_ACCESS_EXPIRES_IN', { infer: true });
  }
}
