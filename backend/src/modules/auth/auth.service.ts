import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GENERIC_AUTH_FAILURE_MESSAGE } from './auth.constants';
import { AccessTokenService } from './services/access-token.service';
import {
  IssuedRefreshCredential,
  RefreshSessionService,
} from './services/refresh-session.service';
import { PasswordHasherService } from './services/password-hasher.service';
import { SafeUser, UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../users/enums/user-status.enum';

export interface AuthResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: SafeUser;
  refresh: IssuedRefreshCredential;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordHasherService,
    private readonly accessTokens: AccessTokenService,
    private readonly refreshSessions: RefreshSessionService,
    private readonly dataSource: DataSource,
  ) {}

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.users.findByEmailWithPassword(email);

    if (!user?.passwordHash) {
      await this.passwords.verifyUnknownUser(password);
      throw this.invalidCredentials();
    }

    const passwordMatches = await this.passwords.verify(
      user.passwordHash,
      password,
    );

    if (!passwordMatches || user.status !== UserStatus.ACTIVE) {
      throw this.invalidCredentials();
    }

    return this.issueForUser(user, true);
  }

  async refresh(cookieValue: string | undefined): Promise<AuthResult> {
    const parsed = this.refreshSessions.parseCookie(cookieValue);

    if (!parsed) {
      throw this.invalidSession();
    }

    const session = await this.refreshSessions.findById(parsed.sessionId);

    if (!session) {
      throw this.invalidSession();
    }

    if (!this.refreshSessions.matchesSecret(session, parsed.secret)) {
      await this.refreshSessions.revoke(session);
      throw this.invalidSession();
    }

    if (!this.refreshSessions.isUsable(session)) {
      throw this.invalidSession();
    }

    const user = await this.users.findActiveById(session.userId);

    if (!user) {
      await this.refreshSessions.revoke(session);
      throw this.invalidSession();
    }

    const refresh = await this.refreshSessions.rotate(session);
    return this.toAuthResult(user, refresh);
  }

  async logout(cookieValue: string | undefined): Promise<void> {
    const parsed = this.refreshSessions.parseCookie(cookieValue);

    if (!parsed) {
      return;
    }

    const session = await this.refreshSessions.findById(parsed.sessionId);

    if (!session) {
      return;
    }

    if (this.refreshSessions.matchesSecret(session, parsed.secret)) {
      await this.refreshSessions.revoke(session);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshSessions.revokeAllForUser(userId);
  }

  async requireActiveSession(userId: string, sessionId: string): Promise<User> {
    const session = await this.refreshSessions.findById(sessionId);

    if (
      !session ||
      session.userId !== userId ||
      !this.refreshSessions.isUsable(session)
    ) {
      throw new UnauthorizedException('Invalid access token');
    }

    const user = await this.users.findActiveById(userId);

    if (!user) {
      throw new UnauthorizedException('Invalid access token');
    }

    return user;
  }

  private async issueForUser(
    user: User,
    updateLastLogin: boolean,
  ): Promise<AuthResult> {
    const issued = await this.dataSource.transaction(async (manager) => {
      const refresh = await this.refreshSessions.createSession(
        user.id,
        manager,
      );

      if (updateLastLogin) {
        await manager.update(
          User,
          { id: user.id },
          { lastLoginAt: new Date() },
        );
      }

      return refresh;
    });

    const persisted = await this.users.findById(user.id);

    if (!persisted) {
      throw this.invalidCredentials();
    }

    return this.toAuthResult(persisted, issued);
  }

  private toAuthResult(
    user: User,
    refresh: IssuedRefreshCredential,
  ): AuthResult {
    return {
      accessToken: this.accessTokens.sign({
        sub: user.id,
        role: user.role,
        sid: refresh.sessionId,
      }),
      tokenType: 'Bearer',
      expiresIn: this.accessTokens.expiresInSeconds(),
      user: this.users.toSafeUser(user),
      refresh,
    };
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException(GENERIC_AUTH_FAILURE_MESSAGE);
  }

  private invalidSession(): UnauthorizedException {
    return new UnauthorizedException('Invalid authentication session');
  }
}
