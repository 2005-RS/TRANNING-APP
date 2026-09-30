import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EnvironmentVariables } from '../../../config/env.validation';
import {
  MAIL_TRANSPORT,
  MailTransport,
} from '../../../mail/mail-transport.interface';
import { User } from '../../users/entities/user.entity';
import { UserStatus } from '../../users/enums/user-status.enum';
import { UsersService } from '../../users/users.service';
import {
  INVALID_RESET_TOKEN_MESSAGE,
  PASSWORD_RESET_SECRET_BYTES,
  PASSWORD_RESET_TTL_MS,
} from '../auth.constants';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { PasswordHasherService } from './password-hasher.service';
import { RefreshSessionService } from './refresh-session.service';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokens: Repository<PasswordResetToken>,
    private readonly users: UsersService,
    private readonly passwords: PasswordHasherService,
    private readonly refreshSessions: RefreshSessionService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    @Inject(MAIL_TRANSPORT) private readonly mail: MailTransport,
  ) {}

  /** Unknown and disabled accounts return silently, so callers cannot enumerate. */
  async requestReset(email: string): Promise<void> {
    const user = await this.users.findActiveByEmail(email);

    if (!user) {
      return;
    }

    const secret = randomBytes(PASSWORD_RESET_SECRET_BYTES).toString(
      'base64url',
    );
    const saved = await this.tokens.save(
      this.tokens.create({
        userId: user.id,
        tokenDigest: this.digest(secret),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        usedAt: null,
      }),
    );

    // Delivery is not awaited: SMTP latency would otherwise reveal which
    // addresses belong to an account.
    void this.mail
      .send({
        to: user.email,
        subject: 'Reset your password',
        text: this.buildBody(`${saved.id}.${secret}`),
      })
      .catch((error: unknown) => {
        this.logger.error(
          `Password reset email delivery failed (${error instanceof Error ? error.name : 'unknown error'})`,
        );
      });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const parsed = this.parseToken(token);

    if (!parsed) {
      throw this.invalidToken();
    }

    await this.dataSource.transaction(async (manager) => {
      const tokens = manager.getRepository(PasswordResetToken);
      const record = await tokens
        .createQueryBuilder('token')
        .addSelect('token.tokenDigest')
        .setLock('pessimistic_write')
        .where('token.id = :id', { id: parsed.id })
        .getOne();

      if (
        !record ||
        record.usedAt ||
        record.expiresAt.getTime() <= Date.now() ||
        !this.safeEqualHex(record.tokenDigest, this.digest(parsed.secret))
      ) {
        throw this.invalidToken();
      }

      const user = await manager
        .getRepository(User)
        .findOne({ where: { id: record.userId, status: UserStatus.ACTIVE } });

      if (!user) {
        throw this.invalidToken();
      }

      await this.users.updatePasswordHash(
        manager,
        user.id,
        await this.passwords.hash(password),
      );
      await tokens
        .createQueryBuilder()
        .update(PasswordResetToken)
        .set({ usedAt: () => 'CURRENT_TIMESTAMP' })
        .where('user_id = :userId', { userId: user.id })
        .andWhere('used_at IS NULL')
        .execute();
      await this.refreshSessions.revokeAllForUser(user.id, manager);
    });
  }

  private buildBody(token: string): string {
    const origin = this.config.getOrThrow('APP_PUBLIC_URL', { infer: true });
    // The token travels in the fragment so it never reaches server or proxy logs.
    const link = `${origin.replace(/\/+$/, '')}/reset-password#token=${token}`;
    const minutes = PASSWORD_RESET_TTL_MS / 60_000;

    return [
      'We received a request to reset your password.',
      '',
      `Choose a new password here (the link works once and expires in ${minutes} minutes):`,
      link,
      '',
      'If you did not ask for this, you can ignore this email. Your password stays the same.',
    ].join('\n');
  }

  private parseToken(token: string): { id: string; secret: string } | null {
    const separator = token.indexOf('.');

    if (separator <= 0 || token.indexOf('.', separator + 1) !== -1) {
      return null;
    }

    const id = token.slice(0, separator);
    const secret = token.slice(separator + 1);

    if (!UUID_PATTERN.test(id) || secret.length < 32) {
      return null;
    }

    return { id, secret };
  }

  private digest(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  private safeEqualHex(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private invalidToken(): BadRequestException {
    return new BadRequestException(INVALID_RESET_TOKEN_MESSAGE);
  }
}
