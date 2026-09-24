import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { EnvironmentVariables } from '../../../config/env.validation';
import { REFRESH_SECRET_BYTES } from '../auth.constants';
import { AuthSession } from '../entities/auth-session.entity';

export interface IssuedRefreshCredential {
  sessionId: string;
  cookieValue: string;
  expiresAt: Date;
}

@Injectable()
export class RefreshSessionService {
  constructor(
    @InjectRepository(AuthSession)
    private readonly sessions: Repository<AuthSession>,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async createSession(
    userId: string,
    manager?: EntityManager,
  ): Promise<IssuedRefreshCredential> {
    const sessions = manager
      ? manager.getRepository(AuthSession)
      : this.sessions;
    const secret = randomBytes(REFRESH_SECRET_BYTES).toString('base64url');
    const expiresAt = this.buildExpiry();
    const session = sessions.create({
      userId,
      refreshTokenDigest: this.digest(secret),
      expiresAt,
      revokedAt: null,
      lastUsedAt: new Date(),
    });
    const saved = await sessions.save(session);

    return {
      sessionId: saved.id,
      cookieValue: this.toCookieValue(saved.id, secret),
      expiresAt,
    };
  }

  parseCookie(cookieValue: string | undefined): {
    sessionId: string;
    secret: string;
  } | null {
    if (!cookieValue) {
      return null;
    }

    const separator = cookieValue.indexOf('.');
    if (separator <= 0 || separator === cookieValue.length - 1) {
      return null;
    }

    if (cookieValue.indexOf('.', separator + 1) !== -1) {
      return null;
    }

    const sessionId = cookieValue.slice(0, separator);
    const secret = cookieValue.slice(separator + 1);
    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuid.test(sessionId) || secret.length < 32) {
      return null;
    }

    return { sessionId, secret };
  }

  async rotate(session: AuthSession): Promise<IssuedRefreshCredential> {
    const secret = randomBytes(REFRESH_SECRET_BYTES).toString('base64url');
    session.refreshTokenDigest = this.digest(secret);
    session.lastUsedAt = new Date();
    await this.sessions.save(session);

    return {
      sessionId: session.id,
      cookieValue: this.toCookieValue(session.id, secret),
      expiresAt: session.expiresAt,
    };
  }

  async revoke(session: AuthSession): Promise<void> {
    if (session.revokedAt) {
      return;
    }

    session.revokedAt = new Date();
    await this.sessions.save(session);
  }

  async revokeAllForUser(
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const sessions = manager
      ? manager.getRepository(AuthSession)
      : this.sessions;
    await sessions
      .createQueryBuilder()
      .update(AuthSession)
      .set({ revokedAt: () => 'CURRENT_TIMESTAMP' })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  async findById(sessionId: string): Promise<AuthSession | null> {
    return this.sessions
      .createQueryBuilder('session')
      .addSelect('session.refreshTokenDigest')
      .where('session.id = :id', { id: sessionId })
      .getOne();
  }

  matchesSecret(session: AuthSession, secret: string): boolean {
    return this.safeEqualHex(session.refreshTokenDigest, this.digest(secret));
  }

  isUsable(session: AuthSession): boolean {
    if (session.revokedAt) {
      return false;
    }

    return session.expiresAt.getTime() > Date.now();
  }

  private digest(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  private toCookieValue(sessionId: string, secret: string): string {
    return `${sessionId}.${secret}`;
  }

  private buildExpiry(): Date {
    const days = this.config.getOrThrow('AUTH_REFRESH_TTL_DAYS', {
      infer: true,
    });
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private safeEqualHex(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}
