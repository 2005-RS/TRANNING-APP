import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { AuthService } from '../auth.service';
import { AccessTokenService } from '../services/access-token.service';
import { AuthenticatedUser } from '../types/authenticated-user';

@Injectable()
export class AccessAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokens: AccessTokenService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.readBearer(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const payload = this.accessTokens.verify(token);
    const user = await this.auth.requireActiveSession(payload.sub, payload.sid);

    if (user.role !== payload.role) {
      throw new UnauthorizedException('Invalid access token');
    }

    const principal: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      sessionId: payload.sid,
    };

    request.user = principal;
    return true;
  }

  private readBearer(header: string | undefined): string | null {
    if (!header) {
      return null;
    }

    const [scheme, token, extra] = header.split(' ');

    if (scheme !== 'Bearer' || !token || extra) {
      return null;
    }

    return token;
  }
}
