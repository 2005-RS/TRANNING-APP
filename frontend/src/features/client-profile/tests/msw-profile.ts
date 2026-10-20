import { http, HttpResponse } from 'msw';
import type { ClientResponseDto, ClientSelfUpdateDto } from '@/generated/models';

const API = 'http://localhost:3000/api/v1/clients/me';

const baseProfile: ClientResponseDto = {
  id: '11111111-aaaa-4111-8111-111111111111',
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'client.a@example.test',
    firstName: 'Ada',
    lastName: 'Client',
    role: 'CLIENT',
    status: 'ACTIVE',
  } as ClientResponseDto['user'],
  phone: '88887777',
  dateOfBirth: null,
  primaryGoal: 'GENERAL_FITNESS',
  goalNotes: null,
  experienceLevel: 'BEGINNER',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

type ProfileMockState = {
  profile: ClientResponseDto;
  updateStatus: number;
  lastUpdate: ClientSelfUpdateDto | null;
};

export const profileMockState: ProfileMockState = {
  profile: structuredClone(baseProfile),
  updateStatus: 200,
  lastUpdate: null,
};

export function resetProfileMockState(): void {
  profileMockState.profile = structuredClone(baseProfile);
  profileMockState.updateStatus = 200;
  profileMockState.lastUpdate = null;
}

/** Must be registered before handlers that match `/clients/:clientId`. */
export const profileHandlers = [
  http.get(API, () => HttpResponse.json(profileMockState.profile)),
  http.patch(API, async ({ request }) => {
    const body = (await request.json()) as ClientSelfUpdateDto;
    profileMockState.lastUpdate = body;
    if (profileMockState.updateStatus >= 400) {
      return HttpResponse.json(
        {
          statusCode: profileMockState.updateStatus,
          code: 'INTERNAL_ERROR',
          message: 'Internal database detail that must not leak',
          path: '/api/v1/clients/me',
          timestamp: '2026-10-12T00:00:00.000Z',
          requestId: 'req-profile',
        },
        { status: profileMockState.updateStatus },
      );
    }
    profileMockState.profile = { ...profileMockState.profile, ...body } as ClientResponseDto;
    return HttpResponse.json(profileMockState.profile);
  }),
];
