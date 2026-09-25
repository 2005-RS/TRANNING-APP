import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AccessTokenService } from '../auth/services/access-token.service';
import { ChatError } from './chat.error';
import { ChatPrincipal } from './types/chat.types';

/**
 * Socket authentication reusing the HTTP access-token rules: the same JWT
 * verification, live refresh-session check, and role match as AccessAuthGuard.
 * Global HTTP guards do not run for WebSocket gateways.
 */
@Injectable()
export class ChatConnectionAuthService {
  constructor(
    private readonly accessTokens: AccessTokenService,
    private readonly auth: AuthService,
  ) {}

  async authenticate(token: unknown): Promise<ChatPrincipal> {
    if (typeof token !== 'string' || token.length === 0) {
      throw new ChatError('UNAUTHORIZED');
    }

    let payload: ReturnType<AccessTokenService['verify']>;
    try {
      payload = this.accessTokens.verify(token);
    } catch {
      throw new ChatError('UNAUTHORIZED');
    }

    if (typeof payload.exp !== 'number') {
      throw new ChatError('UNAUTHORIZED');
    }

    const principal: ChatPrincipal = {
      userId: payload.sub,
      role: payload.role,
      sessionId: payload.sid,
      tokenExpiresAt: payload.exp * 1000,
    };
    await this.assertStillValid(principal);
    return principal;
  }

  /** Re-checked on every message: the token may expire or the session may be revoked while the socket stays open. */
  async assertStillValid(principal: ChatPrincipal): Promise<void> {
    if (Date.now() >= principal.tokenExpiresAt) {
      throw new ChatError('AUTH_EXPIRED');
    }

    try {
      const user = await this.auth.requireActiveSession(
        principal.userId,
        principal.sessionId,
      );
      if (user.role !== principal.role) {
        throw new ChatError('UNAUTHORIZED');
      }
    } catch {
      throw new ChatError('UNAUTHORIZED');
    }
  }
}
