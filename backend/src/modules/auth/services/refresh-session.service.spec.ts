import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../../config/env.validation';
import { RefreshSessionService } from './refresh-session.service';

describe('RefreshSessionService.parseCookie', () => {
  const service = new RefreshSessionService(
    {} as never,
    {
      getOrThrow: () => 30,
    } as unknown as ConfigService<EnvironmentVariables, true>,
  );

  it('parses a session-id.secret cookie', () => {
    const parsed = service.parseCookie(
      '550e8400-e29b-41d4-a716-446655440000.abcdefghijklmnopqrstuvwxyz012345',
    );

    expect(parsed?.sessionId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('rejects malformed cookies', () => {
    expect(service.parseCookie(undefined)).toBeNull();
    expect(service.parseCookie('not-a-cookie')).toBeNull();
    expect(service.parseCookie('a.b.c')).toBeNull();
  });
});
