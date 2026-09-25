import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AccessTokenService } from '../auth/services/access-token.service';
import { UserRole } from '../users/enums/user-role.enum';
import { ChatConnectionAuthService } from './chat-connection-auth.service';

describe('ChatConnectionAuthService', () => {
  const futureExp = () => Math.floor(Date.now() / 1000) + 600;

  function build(options: {
    verify?: jest.Mock;
    requireActiveSession?: jest.Mock;
  }) {
    const accessTokens = {
      verify:
        options.verify ??
        jest.fn(() => ({
          sub: 'user-1',
          role: UserRole.CLIENT,
          sid: 'session-1',
          exp: futureExp(),
        })),
    };
    const auth = {
      requireActiveSession:
        options.requireActiveSession ??
        jest.fn(() => Promise.resolve({ id: 'user-1', role: UserRole.CLIENT })),
    };
    return {
      service: new ChatConnectionAuthService(
        accessTokens as unknown as AccessTokenService,
        auth as unknown as AuthService,
      ),
      accessTokens,
      auth,
    };
  }

  it('derives identity and role from the verified token and live session', async () => {
    const { service, auth } = build({});

    const principal = await service.authenticate('valid-token');

    expect(principal).toMatchObject({
      userId: 'user-1',
      role: UserRole.CLIENT,
      sessionId: 'session-1',
    });
    expect(principal.tokenExpiresAt).toBeGreaterThan(Date.now());
    expect(auth.requireActiveSession).toHaveBeenCalledWith(
      'user-1',
      'session-1',
    );
  });

  it.each([undefined, '', 42, { token: 'x' }])(
    'rejects a missing or non-string token (%p)',
    async (token) => {
      const { service, accessTokens } = build({});
      await expect(service.authenticate(token)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
      expect(accessTokens.verify).not.toHaveBeenCalled();
    },
  );

  it('rejects an invalid token', async () => {
    const { service } = build({
      verify: jest.fn(() => {
        throw new UnauthorizedException('Invalid access token');
      }),
    });
    await expect(service.authenticate('forged')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('rejects a revoked session', async () => {
    const { service } = build({
      requireActiveSession: jest.fn(() =>
        Promise.reject(new UnauthorizedException()),
      ),
    });
    await expect(service.authenticate('token')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('rejects when the stored role no longer matches the token role', async () => {
    const { service } = build({
      requireActiveSession: jest.fn(() =>
        Promise.resolve({ id: 'user-1', role: UserRole.TRAINER }),
      ),
    });
    await expect(service.authenticate('token')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('reports an expired token as AUTH_EXPIRED on later messages', async () => {
    const { service } = build({});
    await expect(
      service.assertStillValid({
        userId: 'user-1',
        role: UserRole.CLIENT,
        sessionId: 'session-1',
        tokenExpiresAt: Date.now() - 1,
      }),
    ).rejects.toMatchObject({ code: 'AUTH_EXPIRED' });
  });
});
