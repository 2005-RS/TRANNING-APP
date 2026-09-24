import type { AuthUserResponseDto } from '@/generated/models';
import { AuthUserResponseDtoRole } from '@/generated/models';

export const clientA: AuthUserResponseDto = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'client.a@example.test',
  firstName: 'Ada',
  lastName: 'Client',
  role: AuthUserResponseDtoRole.CLIENT,
};

export const trainerA: AuthUserResponseDto = {
  id: '33333333-3333-4333-8333-333333333333',
  email: 'trainer.a@example.test',
  firstName: 'Tess',
  lastName: 'Trainer',
  role: AuthUserResponseDtoRole.TRAINER,
};

export const adminA: AuthUserResponseDto = {
  id: '44444444-4444-4444-8444-444444444444',
  email: 'admin.a@example.test',
  firstName: 'Avery',
  lastName: 'Admin',
  role: AuthUserResponseDtoRole.ADMIN,
};

export const clientB: AuthUserResponseDto = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'client.b@example.test',
  firstName: 'Bea',
  lastName: 'Client',
  role: AuthUserResponseDtoRole.CLIENT,
};

export function jsonError(
  status: number,
  code: string,
  message: string,
  path: string,
): Response {
  return new Response(
    JSON.stringify({
      statusCode: status,
      code,
      message,
      path,
      timestamp: '2026-09-04T00:00:00.000Z',
      requestId: `req-${code.toLowerCase()}`,
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}
