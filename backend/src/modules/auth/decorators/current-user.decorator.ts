import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../types/authenticated-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    return user;
  },
);
