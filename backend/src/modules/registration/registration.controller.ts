import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import {
  AUTH_REGISTER_THROTTLE_LIMIT,
  AUTH_REGISTER_THROTTLE_TTL_MS,
} from '../auth/auth.constants';
import { AuthService } from '../auth/auth.service';
import { AuthTokenResponseDto } from '../auth/dto/auth-token-response.dto';
import { AuthCookieService } from '../auth/services/auth-cookie.service';
import { ClientsService } from '../clients/clients.service';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class RegistrationController {
  constructor(
    private readonly clients: ClientsService,
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({
    default: {
      limit: AUTH_REGISTER_THROTTLE_LIMIT,
      ttl: AUTH_REGISTER_THROTTLE_TTL_MS,
    },
  })
  @ApiOperation({
    summary: 'Create a free client account and authenticate immediately',
  })
  @ApiCreatedResponse({ type: AuthTokenResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokenResponseDto> {
    if (dto.acceptTerms !== true) {
      throw new BadRequestException('acceptTerms must be true');
    }

    await this.clients.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      primaryGoal: dto.primaryGoal,
      experienceLevel: dto.experienceLevel,
      goalNotes: dto.goalNotes,
    });
    const result = await this.auth.login(dto.email, dto.password);
    response.cookie(
      this.cookies.cookieName(),
      result.refresh.cookieValue,
      this.cookies.buildOptions(result.refresh.expiresAt),
    );
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
