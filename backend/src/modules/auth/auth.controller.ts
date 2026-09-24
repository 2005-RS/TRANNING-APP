import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import {
  AUTH_LOGIN_THROTTLE_LIMIT,
  AUTH_LOGIN_THROTTLE_TTL_MS,
  AUTH_REFRESH_THROTTLE_LIMIT,
  AUTH_REFRESH_THROTTLE_TTL_MS,
} from './auth.constants';
import { AuthService, AuthResult } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  AuthTokenResponseDto,
  AuthUserResponseDto,
} from './dto/auth-token-response.dto';
import { LoginDto } from './dto/login.dto';
import { AuthCookieService } from './services/auth-cookie.service';
import { AuthenticatedUser } from './types/authenticated-user';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: AUTH_LOGIN_THROTTLE_LIMIT,
      ttl: AUTH_LOGIN_THROTTLE_TTL_MS,
    },
  })
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthTokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiTooManyRequestsResponse()
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokenResponseDto> {
    const result = await this.auth.login(dto.email, dto.password);
    this.setRefreshCookie(response, result);
    return this.toResponse(result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: AUTH_REFRESH_THROTTLE_LIMIT,
      ttl: AUTH_REFRESH_THROTTLE_TTL_MS,
    },
  })
  @ApiCookieAuth('refresh-session')
  @ApiOperation({
    summary: 'Rotate the refresh session cookie and issue a new access token',
  })
  @ApiOkResponse({ type: AuthTokenResponseDto })
  @ApiUnauthorizedResponse()
  @ApiTooManyRequestsResponse()
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokenResponseDto> {
    const result = await this.auth.refresh(this.cookies.read(request));
    this.setRefreshCookie(response, result);
    return this.toResponse(result);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth('refresh-session')
  @ApiOperation({ summary: 'Revoke the current refresh session' })
  @ApiNoContentResponse()
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(this.cookies.read(request));
    this.clearRefreshCookie(response);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke all refresh sessions for the current user' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logoutAll(user.id);
    this.clearRefreshCookie(response);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Return the authenticated user identity' })
  @ApiOkResponse({ type: AuthUserResponseDto })
  @ApiUnauthorizedResponse()
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  private setRefreshCookie(response: Response, result: AuthResult): void {
    response.cookie(
      this.cookies.cookieName(),
      result.refresh.cookieValue,
      this.cookies.buildOptions(result.refresh.expiresAt),
    );
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(
      this.cookies.cookieName(),
      this.cookies.clearOptions(),
    );
  }

  private toResponse(result: AuthResult): AuthTokenResponseDto {
    return {
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      expiresIn: result.expiresIn,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
      },
    };
  }
}
