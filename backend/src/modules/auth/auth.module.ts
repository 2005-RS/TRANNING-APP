import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvironmentVariables } from '../../config/env.validation';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailModule } from '../../mail/mail.module';
import { AuthSession } from './entities/auth-session.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { AccessAuthGuard } from './guards/access-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AccessTokenService } from './services/access-token.service';
import { AuthCookieService } from './services/auth-cookie.service';
import { PasswordHasherService } from './services/password-hasher.service';
import { PasswordResetService } from './services/password-reset.service';
import { RefreshSessionService } from './services/refresh-session.service';

@Module({
  imports: [
    UsersModule,
    MailModule,
    TypeOrmModule.forFeature([AuthSession, PasswordResetToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        secret: config.getOrThrow('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.getOrThrow('JWT_ACCESS_EXPIRES_IN', {
            infer: true,
          }),
          issuer: config.getOrThrow('JWT_ACCESS_ISSUER', { infer: true }),
          audience: config.getOrThrow('JWT_ACCESS_AUDIENCE', { infer: true }),
        },
        verifyOptions: {
          algorithms: ['HS256'],
          issuer: config.getOrThrow('JWT_ACCESS_ISSUER', { infer: true }),
          audience: config.getOrThrow('JWT_ACCESS_AUDIENCE', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenService,
    RefreshSessionService,
    PasswordHasherService,
    PasswordResetService,
    AuthCookieService,
    AccessAuthGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: AccessAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [
    PasswordHasherService,
    RefreshSessionService,
    AccessTokenService,
    AuthService,
  ],
})
export class AuthModule {}
